package com.mrbiryani.chat;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.BranchAccess;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin-only knowledge management. Publishing is a separate permission from editing. */
@RestController
@RequestMapping("/api/v1/chat/knowledge")
public class KnowledgeController {

    public record SourceRequest(@NotBlank @Size(min = 3, max = 200) String title,
            @NotBlank String type,
            @NotBlank @Size(min = 20, max = 20000) String content) {}

    private final KnowledgeService knowledge;
    private final BranchAccess branchAccess;

    public KnowledgeController(KnowledgeService knowledge, BranchAccess branchAccess) {
        this.knowledge = knowledge;
        this.branchAccess = branchAccess;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_chat.knowledge.read')")
    Map<String, Object> list() {
        return Map.of("data", knowledge.list());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_chat.knowledge.manage')")
    ResponseEntity<Map<String, Object>> create(@Valid @RequestBody SourceRequest body) {
        UUID id = knowledge.create(body.title(), body.type().trim().toUpperCase(), body.content(),
                branchAccess.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("id", id)));
    }

    /** Publishing makes the current content retrievable by customers. Drafts are never retrieved. */
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('PERM_chat.knowledge.publish')")
    Map<String, Object> publish(@PathVariable UUID id) {
        int version = knowledge.publish(id, branchAccess.currentUserId());
        return Map.of("data", Map.of("id", id, "version", version));
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize("hasAuthority('PERM_chat.knowledge.publish')")
    ResponseEntity<Void> retire(@PathVariable UUID id) {
        knowledge.retire(id, branchAccess.currentUserId());
        return ResponseEntity.noContent().build();
    }
}
