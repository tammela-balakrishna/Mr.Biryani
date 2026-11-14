package com.mrbiryani.common;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;

/** Produces the single error envelope: { "error": { code, message, requestId, details? } }. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, Object>> api(ApiException ex, HttpServletRequest req) {
        return body(ex.status(), ex.code(), ex.getMessage(), null, req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Map<String, Object>> denied(AccessDeniedException ex, HttpServletRequest req) {
        return body(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not allowed", null, req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<Map<String, String>> details = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> Map.of("path", f.getField(), "message", String.valueOf(f.getDefaultMessage())))
                .toList();
        return body(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", details, req);
    }

    @ExceptionHandler(org.springframework.web.bind.MissingRequestHeaderException.class)
    ResponseEntity<Map<String, Object>> missingHeader(org.springframework.web.bind.MissingRequestHeaderException ex,
            HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Missing required header: " + ex.getHeaderName(), null, req);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> malformed(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Malformed request body", null, req);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    ResponseEntity<Map<String, Object>> notFound(org.springframework.web.servlet.resource.NoResourceFoundException ex,
            HttpServletRequest req) {
        return body(HttpStatus.NOT_FOUND, "NOT_FOUND", "Route not found", null, req);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(Exception ex, HttpServletRequest req) {
        log.error("Unhandled error requestId={}", requestId(req), ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error", null, req);
    }

    static String requestId(HttpServletRequest req) {
        Object id = req.getAttribute(RequestIdFilter.ATTRIBUTE);
        return id == null ? null : id.toString();
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String code, String message,
            Object details, HttpServletRequest req) {
        Map<String, Object> error = new java.util.LinkedHashMap<>();
        error.put("code", code);
        error.put("message", message);
        error.put("requestId", requestId(req));
        if (details != null) error.put("details", details);
        return ResponseEntity.status(status).body(Map.of("error", error));
    }
}
