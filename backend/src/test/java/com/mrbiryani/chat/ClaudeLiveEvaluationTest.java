package com.mrbiryani.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Live check of the Claude path. Skipped unless ANTHROPIC_API_KEY is set in the environment, so no key
 * is needed in source control. Costs a small number of model calls when it runs.
 */
@SpringBootTest(properties = {
        "JWT_SECRET=test-secret-test-secret-test-secret-123456",
})
@Testcontainers
class ClaudeLiveEvaluationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired KnowledgeService knowledge;
    @Autowired ChatService chat;
    @Autowired LlmClient llm;

    @Test
    void modelAnswersOnlyFromPublishedPassages() {
        Assumptions.assumeTrue(System.getenv("ANTHROPIC_API_KEY") != null
                && !System.getenv("ANTHROPIC_API_KEY").isBlank(), "ANTHROPIC_API_KEY not set; live check skipped");
        assertThat(llm.enabled()).isTrue();

        UUID id = knowledge.create("Live check hours", "FAQ",
                "We are open from 11:00 to 23:00 every day, including public holidays.", null);
        knowledge.publish(id, null);

        ChatService.Reply reply = chat.ask(chat.createSession(null), null, "When are you open?");
        assertThat(reply.kind()).isEqualTo("PUBLIC_KNOWLEDGE");
        assertThat(reply.answer()).isNotBlank();
        assertThat(reply.answer()).contains("11");
    }
}
