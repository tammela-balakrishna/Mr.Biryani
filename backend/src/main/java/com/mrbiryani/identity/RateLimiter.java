package com.mrbiryani.identity;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window, in-process limiter for auth endpoints. Single-instance only; replace with a
 * shared store (Redis) before running multiple replicas.
 */
final class RateLimiter {

    private record Window(Instant start, int count) {}

    private final int limit;
    private final Duration window;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    RateLimiter(int limit, Duration window) {
        this.limit = limit;
        this.window = window;
    }

    boolean tryAcquire(String key) {
        Instant now = Instant.now();
        boolean[] allowed = {false};
        windows.compute(key, (k, w) -> {
            if (w == null || now.isAfter(w.start().plus(window))) {
                allowed[0] = true;
                return new Window(now, 1);
            }
            if (w.count() < limit) {
                allowed[0] = true;
                return new Window(w.start(), w.count() + 1);
            }
            return w;
        });
        if (windows.size() > 10_000) windows.clear(); // crude bound on memory
        return allowed[0];
    }
}
