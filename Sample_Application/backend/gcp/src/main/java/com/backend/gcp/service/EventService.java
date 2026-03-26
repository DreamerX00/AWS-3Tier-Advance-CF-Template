package com.backend.gcp.service;

import com.backend.gcp.exception.ResourceNotFoundException;
import com.backend.gcp.model.Event;
import com.backend.gcp.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository repository;

    public List<Event> findAll() {
        return repository.findAll();
    }

    public Event findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id));
    }

    public List<Event> search(String query) {
        return repository.search(query);
    }

    public List<Event> findActive() {
        return repository.findByIsActive(true);
    }

    public List<Event> findByCategory(String category) {
        return repository.findByCategory(category);
    }

    public List<Event> findByDateRange(LocalDate start, LocalDate end) {
        return repository.findByDateBetween(start, end);
    }

    public List<Event> findUpcoming() {
        return repository.findByDateAfter(LocalDate.now());
    }

    public Event create(Event event) {
        return repository.save(event);
    }

    public Event update(Long id, Event updated) {
        Event e = findById(id);
        e.setName(updated.getName());
        e.setDescription(updated.getDescription());
        e.setVenue(updated.getVenue());
        e.setDate(updated.getDate());
        e.setTime(updated.getTime());
        e.setOrganizer(updated.getOrganizer());
        e.setCapacity(updated.getCapacity());
        e.setIsActive(updated.getIsActive());
        e.setCategory(updated.getCategory());
        e.setRegistrationLink(updated.getRegistrationLink());
        return repository.save(e);
    }

    public Event patch(Long id, Map<String, Object> fields) {
        Event e = findById(id);
        fields.forEach((key, value) -> {
            switch (key) {
                case "name" -> e.setName((String) value);
                case "description" -> e.setDescription((String) value);
                case "venue" -> e.setVenue((String) value);
                case "date" -> e.setDate(LocalDate.parse((String) value));
                case "organizer" -> e.setOrganizer((String) value);
                case "capacity" -> e.setCapacity((Integer) value);
                case "isActive" -> e.setIsActive((Boolean) value);
                case "category" -> e.setCategory((String) value);
                case "registrationLink" -> e.setRegistrationLink((String) value);
            }
        });
        return repository.save(e);
    }

    public void delete(Long id) {
        Event e = findById(id);
        repository.delete(e);
    }
}
