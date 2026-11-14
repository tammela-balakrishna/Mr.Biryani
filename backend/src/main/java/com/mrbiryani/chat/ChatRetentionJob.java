package com.mrbiryani.chat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Deletes conversations past their 30-day expiry (messages, citations and feedback cascade). */
@Component
public class ChatRetentionJob {

    private static final Logger log = LoggerFactory.getLogger(ChatRetentionJob.class);
    private final ChatService chat;

    public ChatRetentionJob(ChatService chat) {
        this.chat = chat;
    }

    @Scheduled(cron = "0 30 2 * * *", zone = "UTC")
    public void purge() {
        int removed = chat.purgeExpired();
        if (removed > 0) log.info("Chat retention removed {} expired sessions", removed);
    }
}
