package com.insurance.portal.repository;

import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findAllByRole(Role role);
    Page<User> findAllByRole(Role role, Pageable pageable);
    long countByRole(Role role);

    @Query("SELECT u FROM User u WHERE u.role = :role AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) ")
    Page<User> searchByRole(@Param("role") Role role, @Param("search") String search, Pageable pageable);
    List<User> findAllByRoleAndActive(Role role, boolean active);
    java.util.Optional<User> findFirstByRoleAndInsuranceTypeAndActive(Role role, String insuranceType, boolean active);
}
