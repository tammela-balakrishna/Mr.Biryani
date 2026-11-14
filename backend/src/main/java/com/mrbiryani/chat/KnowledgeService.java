package com.mrbiryani.chat;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.chat.ChatStore.Source;
import com.mrbiryani.common.ApiException;

/**
 * Admin-curated knowledge. Only PUBLISHED content is ever retrieved by the assistant. Each publish
 * creates a new version; chunks are rebuilt from the approved text, so a draft never reaches customers.
 */
@Service
public class KnowledgeService {

    static final Set<String> TYPES = Set.of("FAQ", "POLICY", "MENU", "BRANCH", "HELP");
    static final int CHUNK_TARGET = 700;

    private final ChatStore store;

    public KnowledgeService(ChatStore store) {
        this.store = store;
    }

    public List<Source> list() {
        return store.listSources();
    }

    @Transactional
    public UUID create(String title, String type, String content, UUID actor) {
        String t = title == null ? "" : title.trim();
        String c = content == null ? "" : content.trim();
        if (t.length() < 3 || t.length() > 200) throw ApiException.badRequest("Title must be 3-200 characters");
        if (!TYPES.contains(type)) throw ApiException.badRequest("Type must be one of " + TYPES);
        if (c.length() < 20 || c.length() > 20_000) throw ApiException.badRequest("Content must be 20-20000 characters");
        UUID id = UUID.randomUUID();
        store.insertSource(id, t, type, c, actor);
        store.audit(actor, "knowledge.created", id.toString());
        return id;
    }

    @Transactional
    public int publish(UUID id, UUID actor) {
        Source s = find(id);
        if ("RETIRED".equals(s.status())) throw ApiException.conflict("Retired sources cannot be published; create a new one");
        int next = s.version() + 1;
        store.replaceChunks(id, s.title(), next, chunk(s.content()));
        store.setPublished(id, next);
        store.audit(actor, "knowledge.published", id.toString() + "@v" + next);
        return next;
    }

    @Transactional
    public void retire(UUID id, UUID actor) {
        find(id);
        store.setRetired(id);
        store.audit(actor, "knowledge.retired", id.toString());
    }

    private Source find(UUID id) {
        return store.findSource(id).orElseThrow(() -> ApiException.notFound("Knowledge source not found"));
    }

    /** Splits on blank lines and merges paragraphs up to a target size; long paragraphs are split at sentence ends. */
    static List<String> chunk(String text) {
        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String paragraph : text.split("\\n\\s*\\n")) {
            String p = paragraph.trim();
            if (p.isEmpty()) continue;
            for (String piece : split(p)) {
                if (current.length() > 0 && current.length() + piece.length() + 2 > CHUNK_TARGET) {
                    out.add(current.toString());
                    current.setLength(0);
                }
                if (current.length() > 0) current.append("\n\n");
                current.append(piece);
            }
        }
        if (current.length() > 0) out.add(current.toString());
        return out;
    }

    private static List<String> split(String paragraph) {
        if (paragraph.length() <= CHUNK_TARGET) return List.of(paragraph);
        List<String> pieces = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        for (String sentence : paragraph.split("(?<=[.!?])\\s+")) {
            if (sb.length() > 0 && sb.length() + sentence.length() + 1 > CHUNK_TARGET) {
                pieces.add(sb.toString());
                sb.setLength(0);
            }
            if (sb.length() > 0) sb.append(' ');
            sb.append(sentence);
        }
        if (sb.length() > 0) pieces.add(sb.toString());
        return pieces;
    }
}
