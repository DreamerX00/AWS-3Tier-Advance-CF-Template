package com.backend.gcp.repository;

import com.backend.gcp.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    List<Product> findByCategory(String category);
    List<Product> findByBrand(String brand);
    List<Product> findByPriceBetween(BigDecimal minPrice, BigDecimal maxPrice);
    List<Product> findByStockLessThan(Integer threshold);

    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.category) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Product> search(@Param("q") String query);
}
