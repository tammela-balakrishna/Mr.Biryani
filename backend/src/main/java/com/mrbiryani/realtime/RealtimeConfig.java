package com.mrbiryani.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.mrbiryani.config.AppProperties;

@Configuration
@EnableWebSocketMessageBroker
public class RealtimeConfig implements WebSocketMessageBrokerConfigurer {

    private final AppProperties props;
    private final StompAuthInterceptor auth;

    public RealtimeConfig(AppProperties props, StompAuthInterceptor auth) {
        this.props = props;
        this.auth = auth;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        java.util.List<String> patterns = new java.util.ArrayList<>();
        if (props.corsOrigins() != null) {
            patterns.addAll(props.corsOrigins());
        }
        patterns.add("http://localhost:*");
        patterns.add("http://127.0.0.1:*");
        registry.addEndpoint("/ws").setAllowedOriginPatterns(patterns.toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Notifications only: clients re-fetch authoritative state over REST.
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(auth);
    }
}
