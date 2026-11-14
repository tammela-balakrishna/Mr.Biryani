package com.mrbiryani.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.core.io.ClassPathResource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import tools.jackson.databind.ObjectMapper;

/**
 * Offline evaluation of the assistant against a golden set. No model or API key is needed: this checks
 * retrieval, abstention, privacy and quoting behaviour in the fallback mode the assistant uses without a model.
 *
 * The golden files are DRAFTS built from sample content. Replace them with restaurant-approved content
 * before treating the pass rate as a release signal. The report is written to target/eval/report.json.
 */
@SpringBootTest(properties = {
        "JWT_SECRET=test-secret-test-secret-test-secret-123456",
        "app.chat.llm.api-key=",
})
@Testcontainers
class AssistantEvaluationTest {

    static final double MIN_PASS_RATE = 0.9;

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired KnowledgeService knowledge;
    @Autowired ChatService chat;
    @Autowired ObjectMapper json;

    record KnowledgeItem(String title, String type, String content, boolean publish) {}

    record GoldenQuestion(String question, String expectKind, String expectTitle, String mustNotContain) {}

    record Outcome(String question, String kind, boolean passed, String reason) {}

    @Test
    void assistantMeetsTheGoldenSetThreshold() throws IOException {
        KnowledgeItem[] items = read("eval/golden-knowledge.json", KnowledgeItem[].class);
        GoldenQuestion[] questions = read("eval/golden-questions.json", GoldenQuestion[].class);

        for (KnowledgeItem item : items) {
            UUID id = knowledge.create(item.title(), item.type(), item.content(), null);
            if (item.publish()) knowledge.publish(id, null);
        }

        List<Outcome> outcomes = new ArrayList<>();
        for (GoldenQuestion q : questions) {
            ChatService.Reply reply = chat.ask(chat.createSession(null), null, q.question());
            List<String> problems = new ArrayList<>();
            if (!q.expectKind().equals(reply.kind())) problems.add("kind was " + reply.kind());
            if (q.expectTitle() != null && reply.citations().stream().noneMatch(c -> q.expectTitle().equals(c.title()))) {
                problems.add("missing citation to \"" + q.expectTitle() + "\"");
            }
            if (q.mustNotContain() != null && reply.answer().toLowerCase().contains(q.mustNotContain().toLowerCase())) {
                problems.add("answer contains forbidden text");
            }
            outcomes.add(new Outcome(q.question(), reply.kind(), problems.isEmpty(),
                    problems.isEmpty() ? "ok" : String.join("; ", problems)));
        }

        long passed = outcomes.stream().filter(Outcome::passed).count();
        double rate = (double) passed / outcomes.size();
        writeReport(outcomes, rate);
        outcomes.stream().filter(o -> !o.passed())
                .forEach(o -> System.out.println("EVAL FAIL: " + o.question() + " -> " + o.reason()));
        System.out.printf("Assistant golden set: %d/%d passed (%.0f%%)%n", passed, outcomes.size(), rate * 100);

        assertThat(rate).as("golden-set pass rate").isGreaterThanOrEqualTo(MIN_PASS_RATE);
    }

    private <T> T read(String resource, Class<T> type) throws IOException {
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            return json.readValue(in, type);
        }
    }

    private void writeReport(List<Outcome> outcomes, double rate) throws IOException {
        Path dir = Path.of("target", "eval");
        Files.createDirectories(dir);
        String report = json.writerWithDefaultPrettyPrinter().writeValueAsString(
                java.util.Map.of("passRate", rate, "minimum", MIN_PASS_RATE, "results", outcomes));
        Files.writeString(dir.resolve("report.json"), report);
    }
}
