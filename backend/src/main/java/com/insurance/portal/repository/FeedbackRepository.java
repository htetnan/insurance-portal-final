package com.insurance.portal.repository;

import com.insurance.portal.model.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @EntityGraph(attributePaths = "customer")
    Page<Feedback> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = "customer")
    Page<Feedback> findByReadFalseOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = "customer")
    Page<Feedback> findByReadTrueOrderByCreatedAtDesc(Pageable pageable);

    long countByReadFalse();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("update Feedback f set f.read = true where f.read = false")
    int markAllAsRead();
}
