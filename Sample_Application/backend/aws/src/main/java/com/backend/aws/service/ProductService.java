package com.backend.aws.service;

import com.backend.aws.exception.ResourceNotFoundException;
import com.backend.aws.model.Product;
import com.backend.aws.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository repository;

    public List<Product> findAll() {
        return repository.findAll();
    }

    public Product findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
    }

    public List<Product> search(String query) {
        return repository.search(query);
    }

    public List<Product> findByCategory(String category) {
        return repository.findByCategory(category);
    }

    public List<Product> findByPriceRange(BigDecimal min, BigDecimal max) {
        return repository.findByPriceBetween(min, max);
    }

    public List<Product> findLowStock(Integer threshold) {
        return repository.findByStockLessThan(threshold);
    }

    public Product create(Product product) {
        return repository.save(product);
    }

    public Product update(Long id, Product updated) {
        Product p = findById(id);
        p.setName(updated.getName());
        p.setDescription(updated.getDescription());
        p.setPrice(updated.getPrice());
        p.setCategory(updated.getCategory());
        p.setStock(updated.getStock());
        p.setSku(updated.getSku());
        p.setImageUrl(updated.getImageUrl());
        p.setBrand(updated.getBrand());
        return repository.save(p);
    }

    public Product patch(Long id, Map<String, Object> fields) {
        Product p = findById(id);
        fields.forEach((key, value) -> {
            switch (key) {
                case "name" -> p.setName((String) value);
                case "description" -> p.setDescription((String) value);
                case "price" -> p.setPrice(new BigDecimal(value.toString()));
                case "category" -> p.setCategory((String) value);
                case "stock" -> p.setStock((Integer) value);
                case "sku" -> p.setSku((String) value);
                case "imageUrl" -> p.setImageUrl((String) value);
                case "brand" -> p.setBrand((String) value);
            }
        });
        return repository.save(p);
    }

    public void delete(Long id) {
        Product p = findById(id);
        repository.delete(p);
    }
}
