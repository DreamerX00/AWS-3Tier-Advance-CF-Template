package com.backend.aws.service;

import com.backend.aws.exception.ResourceNotFoundException;
import com.backend.aws.model.Note;
import com.backend.aws.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository repository;

    public List<Note> findAll() {
        return repository.findAll();
    }

    public Note findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note", "id", id));
    }

    public List<Note> search(String query) {
        return repository.search(query);
    }

    public List<Note> findByCategory(String category) {
        return repository.findByCategory(category);
    }

    public List<Note> findByAuthor(String author) {
        return repository.findByAuthor(author);
    }

    public List<Note> findPublic() {
        return repository.findByIsPublic(true);
    }

    public Note create(Note note) {
        return repository.save(note);
    }

    public Note update(Long id, Note updated) {
        Note note = findById(id);
        note.setTitle(updated.getTitle());
        note.setContent(updated.getContent());
        note.setCategory(updated.getCategory());
        note.setAuthor(updated.getAuthor());
        note.setIsPublic(updated.getIsPublic());
        note.setTags(updated.getTags());
        return repository.save(note);
    }

    public Note patch(Long id, Map<String, Object> fields) {
        Note note = findById(id);
        fields.forEach((key, value) -> {
            switch (key) {
                case "title" -> note.setTitle((String) value);
                case "content" -> note.setContent((String) value);
                case "category" -> note.setCategory((String) value);
                case "author" -> note.setAuthor((String) value);
                case "isPublic" -> note.setIsPublic((Boolean) value);
                case "tags" -> note.setTags((String) value);
            }
        });
        return repository.save(note);
    }

    public void delete(Long id) {
        Note note = findById(id);
        repository.delete(note);
    }
}
