package com.mrbiryani.chat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "JWT_SECRET=test-secret-test-secret-test-secret-123456",
        "app.auth-rate-limit-per-window=1000",
        "app.seed.admin-email=admin@example.com",
        "app.seed.admin-password=ChangeMe-Admin-123",
})
@AutoConfigureMockMvc
@Testcontainers
class ChatIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;
    @Autowired PasswordEncoder encoder;

    private UUID mainBranch;

    @BeforeEach
    void setUp() throws Exception {
        mainBranch = jdbc.sql("SELECT id FROM branches WHERE code = 'MAIN'").query(UUID.class).single();
        String admin = login("admin@example.com", "ChangeMe-Admin-123");
        // Published policy and FAQ, plus one draft that must never be answered.
        publish(admin, "Cancellation policy", "POLICY",
                "Orders can be cancelled by the customer only while they are still placed. "
                        + "Once the kitchen accepts an order, cancellation needs staff approval.");
        publish(admin, "Opening hours", "FAQ",
                "We are open from 11:00 to 23:00 every day, including public holidays.");
        mvc.perform(post("/api/v1/chat/knowledge").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"title\":\"Unreleased menu\",\"type\":\"MENU\","
                        + "\"content\":\"The unpublished recipe uses a secret zebra saffron blend.\"}"))
                .andExpect(status().isCreated());
    }

    private void publish(String admin, String title, String type, String content) throws Exception {
        MvcResult created = mvc.perform(post("/api/v1/chat/knowledge").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"title\":\"" + title + "\",\"type\":\"" + type + "\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");
        mvc.perform(post("/api/v1/chat/knowledge/" + id + "/publish").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
    }

    private String login(String email, String password) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private String newSession(String token) throws Exception {
        var req = post("/api/v1/chat/sessions");
        if (token != null) req.header("Authorization", "Bearer " + token);
        MvcResult r = mvc.perform(req).andExpect(status().isCreated()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.sessionId");
    }

    private MvcResult ask(String sessionId, String token, String question) throws Exception {
        var req = post("/api/v1/chat/sessions/" + sessionId + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"" + question + "\"}");
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req).andExpect(status().isOk()).andReturn();
    }

    private String customer() throws Exception {
        String email = "chat-" + UUID.randomUUID() + "@example.com";
        MvcResult r = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Chat Customer\",\"email\":\"" + email + "\",\"password\":\"customer-pass-1\"}"))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    @Test
    void anonymousAssistantAnswersFromPublishedKnowledgeWithCitations() throws Exception {
        String session = newSession(null);
        MvcResult r = ask(session, null, "What is your cancellation policy?");
        String body = r.getResponse().getContentAsString();
        assertKind(body, "PUBLIC_KNOWLEDGE");
        org.assertj.core.api.Assertions.assertThat(JsonPath.<String>read(body, "$.data.answer"))
                .contains("cancelled by the customer only while they are still placed");
        // The shared test database holds one copy of the policy per test run, so there can be several matches.
        org.assertj.core.api.Assertions.assertThat(JsonPath.<java.util.List<?>>read(body, "$.data.citations")).isNotEmpty();
        org.assertj.core.api.Assertions.assertThat(JsonPath.<String>read(body, "$.data.citations[0].title"))
                .isEqualTo("Cancellation policy");
    }

    private static void assertKind(String body, String kind) {
        org.assertj.core.api.Assertions.assertThat(JsonPath.<String>read(body, "$.data.kind")).isEqualTo(kind);
    }

    @Test
    void unknownQuestionsAbstainInsteadOfGuessing() throws Exception {
        String session = newSession(null);
        assertKind(ask(session, null, "Do you have a helicopter landing pad?").getResponse().getContentAsString(), "ABSTAIN");
    }

    @Test
    void draftKnowledgeIsNeverAnswered() throws Exception {
        String session = newSession(null);
        assertKind(ask(session, null, "Tell me about the secret zebra saffron blend").getResponse().getContentAsString(),
                "ABSTAIN");
    }

    @Test
    void personalStatusNeedsSignInForGuests() throws Exception {
        String session = newSession(null);
        assertKind(ask(session, null, "What is my order status?").getResponse().getContentAsString(), "LOGIN_REQUIRED");
    }

    @Test
    void signedInCustomerSeesOnlyTheirOwnOrderStatus() throws Exception {
        String admin = login("admin@example.com", "ChangeMe-Admin-123");
        MvcResult cat = mvc.perform(post("/api/v1/menu/categories").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin).content("{\"name\":\"Chat-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String catId = JsonPath.read(cat.getResponse().getContentAsString(), "$.data.id");
        MvcResult item = mvc.perform(post("/api/v1/menu/items").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"categoryId\":\"" + catId + "\",\"name\":\"Chat Item\",\"price\":99}"))
                .andExpect(status().isCreated()).andReturn();
        String itemId = JsonPath.read(item.getResponse().getContentAsString(), "$.data.id");

        String mine = customer();
        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + mine).header("Idempotency-Key", "chat-own-order-1")
                .content("{\"branchId\":\"" + mainBranch + "\",\"items\":[{\"menuItemId\":\"" + itemId + "\",\"quantity\":1}]}"))
                .andExpect(status().isCreated());
        String other = customer();

        String session = newSession(mine);
        MvcResult reply = ask(session, mine, "show me my orders status");
        assertKind(reply.getResponse().getContentAsString(), "PERSONAL_STATUS");
        org.assertj.core.api.Assertions.assertThat(JsonPath.<String>read(reply.getResponse().getContentAsString(), "$.data.answer"))
                .contains("PLACED");

        String otherSession = newSession(other);
        assertKind(ask(otherSession, other, "what is my order status").getResponse().getContentAsString(), "PERSONAL_STATUS");
        org.assertj.core.api.Assertions.assertThat(JsonPath.<String>read(
                ask(otherSession, other, "what is my order status").getResponse().getContentAsString(), "$.data.answer"))
                .doesNotContain("PLACED");
    }

    @Test
    void ownedConversationsArePrivateToTheirOwner() throws Exception {
        String owner = customer();
        String stranger = customer();
        String session = newSession(owner);
        ask(session, owner, "What are your opening hours?");

        mvc.perform(get("/api/v1/chat/sessions/" + session + "/messages").header("Authorization", "Bearer " + stranger))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/chat/sessions/" + session + "/messages").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
        mvc.perform(post("/api/v1/chat/sessions/" + session + "/messages").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + stranger).content("{\"message\":\"hi\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void feedbackIsRecordedForAssistantRepliesOnly() throws Exception {
        String session = newSession(null);
        MvcResult reply = ask(session, null, "What are your opening hours?");
        String messageId = JsonPath.read(reply.getResponse().getContentAsString(), "$.data.messageId");
        mvc.perform(post("/api/v1/chat/sessions/" + session + "/messages/" + messageId + "/feedback")
                .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":\"UP\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/chat/sessions/" + session + "/messages/" + messageId + "/feedback")
                .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":\"MAYBE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void onlyAdminsManageAndPublishKnowledge() throws Exception {
        String mine = customer();
        mvc.perform(post("/api/v1/chat/knowledge").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + mine)
                .content("{\"title\":\"Sneaky\",\"type\":\"FAQ\",\"content\":\"Customers should not be able to add this.\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/chat/knowledge").header("Authorization", "Bearer " + mine))
                .andExpect(status().isForbidden());
    }

    @Test
    void retiredKnowledgeStopsBeingAnswered() throws Exception {
        String admin = login("admin@example.com", "ChangeMe-Admin-123");
        MvcResult created = mvc.perform(post("/api/v1/chat/knowledge").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"title\":\"Parking info\",\"type\":\"HELP\",\"content\":\"Free valet parking is available behind the restaurant.\"}"))
                .andExpect(status().isCreated()).andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");
        mvc.perform(post("/api/v1/chat/knowledge/" + id + "/publish").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
        String session = newSession(null);
        assertKind(ask(session, null, "Is valet parking available?").getResponse().getContentAsString(), "PUBLIC_KNOWLEDGE");

        mvc.perform(post("/api/v1/chat/knowledge/" + id + "/retire").header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        assertKind(ask(session, null, "Is valet parking available?").getResponse().getContentAsString(), "ABSTAIN");
    }
}
