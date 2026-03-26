package com.backend.gcp.repository;

import com.backend.gcp.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByCategory(String category);
    List<Note> findByAuthor(String author);
    List<Note> findByIsPublic(Boolean isPublic);

    @Query("SELECT n FROM Note n WHERE LOWER(n.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(n.content) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(n.tags) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Note> search(@Param("q") String query);
}
