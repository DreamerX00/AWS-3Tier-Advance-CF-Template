package com.backend.aws.repository;

import com.backend.aws.model.Marksheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MarksheetRepository extends JpaRepository<Marksheet, Long> {
    Optional<Marksheet> findByRollNumber(String rollNumber);
    List<Marksheet> findBySemester(Integer semester);
    List<Marksheet> findByYear(Integer year);
    List<Marksheet> findBySemesterAndYear(Integer semester, Integer year);
    List<Marksheet> findBySubject(String subject);
    List<Marksheet> findByGrade(String grade);

    @Query("SELECT m FROM Marksheet m WHERE LOWER(m.studentName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(m.rollNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(m.subject) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Marksheet> search(@Param("q") String query);
}
