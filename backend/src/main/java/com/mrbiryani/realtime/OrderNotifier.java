package com.mrbiryani.realtime;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.mrbiryani.order.OrderStatusChanged;

/** Sends order-status notifications only after the change is committed to PostgreSQL. */
@Component
public class OrderNotifier {

    private static final Logger log = LoggerFactory.getLogger(OrderNotifier.class);
    private final SimpMessagingTemplate messaging;

    public OrderNotifier(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderStatusChanged(OrderStatusChanged event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "order.status");
        payload.put("branchId", event.branchId());
        payload.put("orderId", event.orderId());
        payload.put("status", event.status());
        payload.put("at", event.at());
        Object body = payload;
        try {
            messaging.convertAndSend("/topic/branches/" + event.branchId() + "/kitchen", body);
            messaging.convertAndSend("/topic/branches/" + event.branchId() + "/orders", body);
        } catch (RuntimeException e) {
            // The change is already committed; clients recover by re-fetching over REST.
            log.warn("Could not deliver order notification for {}", event.orderId(), e);
        }
    }
}
