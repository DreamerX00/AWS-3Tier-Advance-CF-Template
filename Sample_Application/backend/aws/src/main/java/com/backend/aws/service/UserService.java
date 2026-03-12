package com.backend.aws.service;

import com.backend.aws.exception.ResourceNotFoundException;
import com.backend.aws.model.User;
import com.backend.aws.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;

    public List<User> findAll() {
        return repository.findAll();
    }

    public User findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    public List<User> search(String query) {
        return repository.search(query);
    }

    public List<User> findByRole(String role) {
        return repository.findByRole(role);
    }

    public List<User> findByCity(String city) {
        return repository.findByCity(city);
    }

    public User create(User user) {
        return repository.save(user);
    }

    public User update(Long id, User updated) {
        User user = findById(id);
        user.setFirstName(updated.getFirstName());
        user.setLastName(updated.getLastName());
        user.setEmail(updated.getEmail());
        user.setPhone(updated.getPhone());
        user.setRole(updated.getRole());
        user.setCity(updated.getCity());
        user.setDepartment(updated.getDepartment());
        return repository.save(user);
    }

    public User patch(Long id, Map<String, Object> fields) {
        User user = findById(id);
        fields.forEach((key, value) -> {
            switch (key) {
                case "firstName" -> user.setFirstName((String) value);
                case "lastName" -> user.setLastName((String) value);
                case "email" -> user.setEmail((String) value);
                case "phone" -> user.setPhone((String) value);
                case "role" -> user.setRole((String) value);
                case "city" -> user.setCity((String) value);
                case "department" -> user.setDepartment((String) value);
            }
        });
        return repository.save(user);
    }

    public void delete(Long id) {
        User user = findById(id);
        repository.delete(user);
    }
}
