package com.backend.gcp.service;

import com.backend.gcp.exception.ResourceNotFoundException;
import com.backend.gcp.model.Task;
import com.backend.gcp.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository repository;

    public List<Task> findAll() {
        return repository.findAll();
    }

    public Task findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", "id", id));
    }

    public List<Task> search(String query) {
        return repository.search(query);
    }

    public List<Task> findByStatus(String status) {
        return repository.findByStatus(status);
    }

    public List<Task> findByPriority(String priority) {
        return repository.findByPriority(priority);
    }

    public List<Task> findByStatusAndPriority(String status, String priority) {
        return repository.findByStatusAndPriority(status, priority);
    }

    public Task create(Task task) {
        return repository.save(task);
    }

    public Task update(Long id, Task updated) {
        Task task = findById(id);
        task.setTitle(updated.getTitle());
        task.setDescription(updated.getDescription());
        task.setStatus(updated.getStatus());
        task.setPriority(updated.getPriority());
        task.setAssignee(updated.getAssignee());
        task.setDueDate(updated.getDueDate());
        task.setTags(updated.getTags());
        return repository.save(task);
    }

    public Task patch(Long id, Map<String, Object> fields) {
        Task task = findById(id);
        fields.forEach((key, value) -> {
            switch (key) {
                case "title" -> task.setTitle((String) value);
                case "description" -> task.setDescription((String) value);
                case "status" -> task.setStatus((String) value);
                case "priority" -> task.setPriority((String) value);
                case "assignee" -> task.setAssignee((String) value);
                case "dueDate" -> task.setDueDate(LocalDate.parse((String) value));
                case "tags" -> task.setTags((String) value);
            }
        });
        return repository.save(task);
    }

    public void delete(Long id) {
        Task task = findById(id);
        repository.delete(task);
    }
}
