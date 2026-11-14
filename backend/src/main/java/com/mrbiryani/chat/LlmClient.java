package com.mrbiryani.chat;

/** Model adapter. The assistant works without one (it answers with quoted, cited passages). */
public interface LlmClient {

    boolean enabled();

    /** Returns the model's text. Throws on provider errors, timeouts or refusals; callers fall back. */
    String complete(String system, String user);
}
