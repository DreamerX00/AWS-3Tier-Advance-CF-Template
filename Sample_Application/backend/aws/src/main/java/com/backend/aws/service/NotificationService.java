package com.backend.aws.service;

import com.backend.aws.exception.ResourceNotFoundException;
import com.backend.aws.model.Notification;
import com.backend.aws.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;

    public List<Notification> findAll() {
        return repository.findAll();
    }

    public Notification findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
    }

    public List<Notification> search(String query) {
        return repository.search(query);
    }

    public List<Notification> findByType(String type) {
        return repository.findByType(type);
    }

    public List<Notification> findByStatus(String status) {
        return repository.findByStatus(status);
    }

    public List<Notification> findUnread() {
        return repository.findByIsRead(false);
    }

    public long getUnreadCount() {
        return repository.countByIsReadFalse();
    }

    public Notification send(Notification notification) {
        notification.setStatus("PENDING");
        Notification saved = repository.save(notification);
        // Simulate async send (in real AWS, this would push to SQS/SNS)
        saved.setStatus("SENT");
        saved.setSentAt(LocalDateTime.now());
        return repository.save(saved);
    }

    public Notification create(Notification notification) {
        return repository.save(notification);
    }

    public Notification update(Long id, Notification updated) {
        Notification n = findById(id);
        n.setTitle(updated.getTitle());
        n.setMessage(updated.getMessage());
        n.setType(updated.getType());
        n.setRecipient(updated.getRecipient());
        n.setStatus(updated.getStatus());
        n.setPriority(updated.getPriority());
        n.setChannel(updated.getChannel());
        return repository.save(n);
    }

    public Notification markAsRead(Long id) {
        Notification n = findById(id);
        n.setIsRead(true);
        return repository.save(n);
    }

    public Notification markAsUnread(Long id) {
        Notification n = findById(id);
        n.setIsRead(false);
        return repository.save(n);
    }

    public Notification patch(Long id, Map<String, Object> fields) {
        Notification n = findById(id);
        fields.forEach((key, value) -> {
            switch (key) {
                case "title" -> n.setTitle((String) value);
                case "message" -> n.setMessage((String) value);
                case "type" -> n.setType((String) value);
                case "recipient" -> n.setRecipient((String) value);
                case "status" -> n.setStatus((String) value);
                case "priority" -> n.setPriority((String) value);
                case "isRead" -> n.setIsRead((Boolean) value);
            }
        });
        return repository.save(n);
    }

    public void delete(Long id) {
        Notification n = findById(id);
        repository.delete(n);
    }
}
