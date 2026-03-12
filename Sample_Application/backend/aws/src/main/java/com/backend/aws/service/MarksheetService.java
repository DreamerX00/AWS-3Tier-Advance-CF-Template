package com.backend.aws.service;

import com.backend.aws.exception.ResourceNotFoundException;
import com.backend.aws.model.Marksheet;
import com.backend.aws.repository.MarksheetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MarksheetService {

    private final MarksheetRepository repository;

    public List<Marksheet> findAll() {
        return repository.findAll();
    }

    public Marksheet findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Marksheet", "id", id));
    }

    public List<Marksheet> search(String query) {
        return repository.search(query);
    }

    public List<Marksheet> findBySemester(Integer semester) {
        return repository.findBySemester(semester);
    }

    public List<Marksheet> findByYear(Integer year) {
        return repository.findByYear(year);
    }

    public List<Marksheet> findBySemesterAndYear(Integer semester, Integer year) {
        return repository.findBySemesterAndYear(semester, year);
    }

    public Marksheet create(Marksheet marksheet) {
        return repository.save(marksheet);
    }

    public Marksheet update(Long id, Marksheet updated) {
        Marksheet m = findById(id);
        m.setStudentName(updated.getStudentName());
        m.setRollNumber(updated.getRollNumber());
        m.setSubject(updated.getSubject());
        m.setMarks(updated.getMarks());
        m.setGrade(updated.getGrade());
        m.setSemester(updated.getSemester());
        m.setYear(updated.getYear());
        m.setRemarks(updated.getRemarks());
        return repository.save(m);
    }

    public Marksheet patch(Long id, Map<String, Object> fields) {
        Marksheet m = findById(id);
        fields.forEach((key, value) -> {
            switch (key) {
                case "studentName" -> m.setStudentName((String) value);
                case "rollNumber" -> m.setRollNumber((String) value);
                case "subject" -> m.setSubject((String) value);
                case "marks" -> m.setMarks((Integer) value);
                case "grade" -> m.setGrade((String) value);
                case "semester" -> m.setSemester((Integer) value);
                case "year" -> m.setYear((Integer) value);
                case "remarks" -> m.setRemarks((String) value);
            }
        });
        return repository.save(m);
    }

    public void delete(Long id) {
        Marksheet m = findById(id);
        repository.delete(m);
    }
}
