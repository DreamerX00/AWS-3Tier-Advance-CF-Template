package com.backend.aws.controller;

import com.backend.aws.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final UserRepository userRepo;
    private final MarksheetRepository marksheetRepo;
    private final NoteRepository noteRepo;
    private final TaskRepository taskRepo;
    private final ProductRepository productRepo;
    private final EventRepository eventRepo;

    @GetMapping("/users")
    public ResponseEntity<byte[]> exportUsers() {
        StringBuilder csv = new StringBuilder("ID,First Name,Last Name,Email,Phone,Role,City,Department\n");
        userRepo.findAll().forEach(u ->
            csv.append(String.format("%d,%s,%s,%s,%s,%s,%s,%s\n",
                u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(),
                safe(u.getPhone()), safe(u.getRole()), safe(u.getCity()), safe(u.getDepartment())))
        );
        return csvResponse(csv, "users.csv");
    }

    @GetMapping("/marksheets")
    public ResponseEntity<byte[]> exportMarksheets() {
        StringBuilder csv = new StringBuilder("ID,Student Name,Roll Number,Subject,Marks,Grade,Semester,Year,Remarks\n");
        marksheetRepo.findAll().forEach(m ->
            csv.append(String.format("%d,%s,%s,%s,%d,%s,%d,%d,%s\n",
                m.getId(), m.getStudentName(), m.getRollNumber(), m.getSubject(),
                m.getMarks(), safe(m.getGrade()), m.getSemester(), m.getYear(), safe(m.getRemarks())))
        );
        return csvResponse(csv, "marksheets.csv");
    }

    @GetMapping("/notes")
    public ResponseEntity<byte[]> exportNotes() {
        StringBuilder csv = new StringBuilder("ID,Title,Category,Author,Public,Tags\n");
        noteRepo.findAll().forEach(n ->
            csv.append(String.format("%d,\"%s\",%s,%s,%s,%s\n",
                n.getId(), n.getTitle().replace("\"", "\"\""), safe(n.getCategory()),
                n.getAuthor(), n.getIsPublic(), safe(n.getTags())))
        );
        return csvResponse(csv, "notes.csv");
    }

    @GetMapping("/tasks")
    public ResponseEntity<byte[]> exportTasks() {
        StringBuilder csv = new StringBuilder("ID,Title,Status,Priority,Assignee,Due Date,Tags\n");
        taskRepo.findAll().forEach(t ->
            csv.append(String.format("%d,\"%s\",%s,%s,%s,%s,%s\n",
                t.getId(), t.getTitle().replace("\"", "\"\""), t.getStatus(),
                t.getPriority(), safe(t.getAssignee()), safe(String.valueOf(t.getDueDate())), safe(t.getTags())))
        );
        return csvResponse(csv, "tasks.csv");
    }

    @GetMapping("/products")
    public ResponseEntity<byte[]> exportProducts() {
        StringBuilder csv = new StringBuilder("ID,Name,Price,Category,Stock,SKU,Brand\n");
        productRepo.findAll().forEach(p ->
            csv.append(String.format("%d,\"%s\",%s,%s,%d,%s,%s\n",
                p.getId(), p.getName().replace("\"", "\"\""), p.getPrice(),
                safe(p.getCategory()), p.getStock(), safe(p.getSku()), safe(p.getBrand())))
        );
        return csvResponse(csv, "products.csv");
    }

    @GetMapping("/events")
    public ResponseEntity<byte[]> exportEvents() {
        StringBuilder csv = new StringBuilder("ID,Name,Venue,Date,Organizer,Capacity,Active,Category\n");
        eventRepo.findAll().forEach(e ->
            csv.append(String.format("%d,\"%s\",%s,%s,%s,%s,%s,%s\n",
                e.getId(), e.getName().replace("\"", "\"\""), e.getVenue(),
                e.getDate(), e.getOrganizer(), safe(String.valueOf(e.getCapacity())),
                e.getIsActive(), safe(e.getCategory())))
        );
        return csvResponse(csv, "events.csv");
    }

    private ResponseEntity<byte[]> csvResponse(StringBuilder csv, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString().getBytes());
    }

    private String safe(String val) {
        return val == null ? "" : val;
    }
}
