package com.backend.gcp.service;

import com.backend.gcp.model.*;
import com.backend.gcp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataSeedService implements CommandLineRunner {

    private final UserRepository userRepo;
    private final MarksheetRepository marksheetRepo;
    private final NoteRepository noteRepo;
    private final TaskRepository taskRepo;
    private final ProductRepository productRepo;
    private final EventRepository eventRepo;
    private final NotificationRepository notifRepo;

    @Override
    public void run(String... args) {
        seedUsers();
        seedMarksheets();
        seedNotes();
        seedTasks();
        seedProducts();
        seedEvents();
        seedNotifications();
        log.info("✅ Demo data seeded successfully");
    }

    private void seedUsers() {
        if (userRepo.count() > 0) return;
        userRepo.save(User.builder().firstName("Akash").lastName("Singh").email("akash@example.com").phone("+91-9876543210").role("ADMIN").city("Bangalore").department("Engineering").build());
        userRepo.save(User.builder().firstName("Priya").lastName("Sharma").email("priya@example.com").phone("+91-9876543211").role("MANAGER").city("Mumbai").department("Product").build());
        userRepo.save(User.builder().firstName("Rahul").lastName("Verma").email("rahul@example.com").phone("+91-9876543212").role("DEVELOPER").city("Hyderabad").department("Engineering").build());
        userRepo.save(User.builder().firstName("Sneha").lastName("Patel").email("sneha@example.com").phone("+91-9876543213").role("USER").city("Pune").department("QA").build());
        userRepo.save(User.builder().firstName("Vikram").lastName("Nair").email("vikram@example.com").phone("+91-9876543214").role("DEVELOPER").city("Chennai").department("DevOps").build());
    }

    private void seedMarksheets() {
        if (marksheetRepo.count() > 0) return;
        marksheetRepo.save(Marksheet.builder().studentName("Akash Singh").rollNumber("CS2101").subject("Cloud Computing").marks(92).grade("A+").semester(5).year(2026).remarks("Excellent performance").build());
        marksheetRepo.save(Marksheet.builder().studentName("Priya Sharma").rollNumber("CS2102").subject("Database Systems").marks(78).grade("B+").semester(5).year(2026).remarks("Good understanding").build());
        marksheetRepo.save(Marksheet.builder().studentName("Rahul Verma").rollNumber("CS2103").subject("Networking").marks(85).grade("A").semester(5).year(2026).remarks("Strong fundamentals").build());
        marksheetRepo.save(Marksheet.builder().studentName("Sneha Patel").rollNumber("CS2104").subject("Operating Systems").marks(65).grade("C").semester(5).year(2026).remarks("Needs improvement").build());
    }

    private void seedNotes() {
        if (noteRepo.count() > 0) return;
        noteRepo.save(Note.builder().title("AWS S3 Cheat Sheet").content("S3 is object storage. Key concepts: buckets, objects, presigned URLs, lifecycle policies, versioning, and cross-region replication.").category("Cloud").author("Akash Singh").isPublic(true).tags("aws,s3,storage").build());
        noteRepo.save(Note.builder().title("Docker Best Practices").content("Use multi-stage builds to reduce image size. Never run containers as root. Use .dockerignore. Pin base image versions.").category("DevOps").author("Rahul Verma").isPublic(true).tags("docker,containers,devops").build());
        noteRepo.save(Note.builder().title("PostgreSQL Indexing").content("B-tree indexes for equality/range queries. GIN for full-text search. BRIN for sequential data. Partial indexes for filtered queries.").category("Database").author("Priya Sharma").isPublic(false).tags("postgresql,indexes,performance").build());
        noteRepo.save(Note.builder().title("Spring Boot Tips").content("Use @ConfigurationProperties for type-safe config. Leverage @Transactional. Use @Scheduled for cron jobs. Spring Actuator for monitoring.").category("Programming").author("Akash Singh").isPublic(true).tags("spring,java,backend").build());
    }

    private void seedTasks() {
        if (taskRepo.count() > 0) return;
        taskRepo.save(Task.builder().title("Set up RDS PostgreSQL").description("Configure Multi-AZ RDS instance with automated backups and parameter groups.").status("DONE").priority("HIGH").assignee("Akash Singh").dueDate(LocalDate.now().minusDays(5)).tags("aws,rds,database").build());
        taskRepo.save(Task.builder().title("Configure ALB with target groups").description("Set up Application Load Balancer with health checks and listener rules.").status("IN_PROGRESS").priority("CRITICAL").assignee("Rahul Verma").dueDate(LocalDate.now().plusDays(3)).tags("aws,alb,networking").build());
        taskRepo.save(Task.builder().title("Implement Redis caching layer").description("Add ElastiCache Redis for session management and API response caching.").status("TODO").priority("MEDIUM").assignee("Priya Sharma").dueDate(LocalDate.now().plusDays(10)).tags("redis,caching,performance").build());
        taskRepo.save(Task.builder().title("Write unit tests for services").description("Achieve 80% code coverage for all service classes using JUnit 5 and Mockito.").status("IN_REVIEW").priority("HIGH").assignee("Sneha Patel").dueDate(LocalDate.now().plusDays(2)).tags("testing,java,quality").build());
        taskRepo.save(Task.builder().title("Containerize frontend with Nginx").description("Create production Nginx config with gzip, caching headers, and React Router support.").status("BLOCKED").priority("MEDIUM").assignee("Vikram Nair").dueDate(LocalDate.now().plusDays(7)).tags("docker,nginx,frontend").build());
    }

    private void seedProducts() {
        if (productRepo.count() > 0) return;
        productRepo.save(Product.builder().name("AWS Solutions Architect Guide").description("Comprehensive guide covering all SAA-C03 exam topics with practice questions.").price(BigDecimal.valueOf(49.99)).category("Books").stock(150).sku("BOOK-SAA-001").brand("AWS Press").build());
        productRepo.save(Product.builder().name("Raspberry Pi 5 (8GB)").description("Latest Raspberry Pi with 8GB RAM, USB-C, PCIe connector for SSD.").price(BigDecimal.valueOf(79.99)).category("Electronics").stock(23).sku("RPI5-8GB-001").brand("Raspberry Pi Foundation").build());
        productRepo.save(Product.builder().name("Docker Pro Subscription").description("Docker Pro plan with unlimited private repos, advanced security scanning.").price(BigDecimal.valueOf(21.00)).category("Software").stock(999).sku("DOCK-PRO-MO").brand("Docker Inc").build());
        productRepo.save(Product.builder().name("NVMe SSD 2TB").description("High-speed M.2 NVMe SSD with 7000MB/s read speed for workstations.").price(BigDecimal.valueOf(149.99)).category("Hardware").stock(4).sku("SSD-NVM-2TB").brand("Samsung").build());
        productRepo.save(Product.builder().name("Kubernetes in Action 2nd Ed").description("Deep dive into Kubernetes with hands-on examples and production patterns.").price(BigDecimal.valueOf(59.99)).category("Books").stock(87).sku("BOOK-K8S-002").brand("Manning").build());
    }

    private void seedEvents() {
        if (eventRepo.count() > 0) return;
        eventRepo.save(Event.builder().name("AWS re:Invent 2026").description("The world's largest cloud computing conference by AWS.").venue("Las Vegas Convention Center, NV").date(LocalDate.of(2026, 12, 1)).organizer("Amazon Web Services").capacity(30000).isActive(true).category("Conference").registrationLink("https://reinvent.awsevents.com").build());
        eventRepo.save(Event.builder().name("Kubernetes Hands-on Workshop").description("Full-day workshop on deploying production workloads on EKS.").venue("Silicon Valley Tech Hub, CA").date(LocalDate.now().plusDays(15)).organizer("CNCF").capacity(200).isActive(true).category("Workshop").registrationLink("https://cncf.io/events").build());
        eventRepo.save(Event.builder().name("DevOps India Summit").description("Annual gathering of DevOps practitioners sharing best practices.").venue("Bangalore International Convention Centre").date(LocalDate.now().plusDays(30)).organizer("DevOps India").capacity(1500).isActive(true).category("Conference").registrationLink("https://devopsindia.com").build());
        eventRepo.save(Event.builder().name("Cloud Security Hackathon").description("48-hour hackathon focused on building secure cloud-native applications.").venue("IIT Bombay, Mumbai").date(LocalDate.now().plusDays(45)).organizer("OWASP India").capacity(500).isActive(true).category("Hackathon").registrationLink("https://owasp.org/events").build());
    }

    private void seedNotifications() {
        if (notifRepo.count() > 0) return;
        notifRepo.save(Notification.builder().title("Welcome to AWS Practice Hub!").message("Your full-stack application is up and running. Explore Users, Tasks, Products and more.").type("EMAIL").recipient("admin@example.com").status("DELIVERED").priority("NORMAL").isRead(false).build());
        notifRepo.save(Notification.builder().title("Low Stock Alert").message("Product 'NVMe SSD 2TB' has only 4 units remaining. Consider restocking.").type("PUSH").recipient("inventory@example.com").status("SENT").priority("HIGH").isRead(false).build());
        notifRepo.save(Notification.builder().title("Task Overdue").message("Task 'Set up RDS PostgreSQL' is past its due date. Please update task status.").type("SMS").recipient("+91-9876543210").status("DELIVERED").priority("URGENT").isRead(true).build());
        notifRepo.save(Notification.builder().title("New User Registered").message("Vikram Nair has joined the platform with DEVELOPER role.").type("WEBHOOK").recipient("slack-webhook-url").status("SENT").priority("LOW").isRead(true).build());
    }
}
