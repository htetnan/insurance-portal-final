package com.insurance.portal.repository;

import com.insurance.portal.model.Claim;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.ClaimStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {
    List<Claim> findAllByCustomer(User customer);
    List<Claim> findAllByCustomerAndStatus(User customer, ClaimStatus status);
    List<Claim> findAllByAgent(User agent);
    List<Claim> findAllByAgentAndStatus(User agent, ClaimStatus status);
    List<Claim> findAllByStatus(ClaimStatus status);
    Page<Claim> findAllByStatus(ClaimStatus status, Pageable pageable);
    long countByCustomerAndStatus(User customer, ClaimStatus status);
    long countByStatus(ClaimStatus status);
    boolean existsByApplication_Id(Long applicationId);

    @Query(value = """
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS total
        FROM claims
        WHERE created_at >= :start
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month_key
        """, nativeQuery = true)
    List<Object[]> monthlyCountsSince(@Param("start") LocalDateTime start);

    void deleteAllByCustomer(User customer);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Claim c SET c.agent = null WHERE c.agent = :agent")
    void clearAgentFromClaims(User agent);
}
