-- ─────────────────────────────────────────────────────────────────────────────
-- Digital Insurance Claim & Premiums Portal — Latest Schema
-- Import once on a fresh machine:
--   mysql -u root -p < database/local_mysql.sql
--
-- After import, Hibernate (ddl-auto=update) keeps the schema up to date
-- automatically whenever you restart the backend.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS `insurance_portal`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `insurance_portal`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `auto_check_logs`;
DROP TABLE IF EXISTS `claims`;
DROP TABLE IF EXISTS `feedbacks`;
DROP TABLE IF EXISTS `form_fields`;
DROP TABLE IF EXISTS `form_templates`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `policy_applications`;
DROP TABLE IF EXISTS `payment_method_configs`;
DROP TABLE IF EXISTS `insurance_packages`;
DROP TABLE IF EXISTS `insurance_types`;
DROP TABLE IF EXISTS `scheduler_settings`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE `users` (
  `id`              bigint       NOT NULL AUTO_INCREMENT,
  `active`          bit(1)       NOT NULL,
  `address`         varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at`      datetime(6)  DEFAULT NULL,
  `email`           varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `insurance_type`  varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name`            varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password`        varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone`           varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_picture` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role`            enum('ADMIN','AGENT','CUSTOMER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at`      datetime(6)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_6dotkott2kjsp8vw4d0m25fb7` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── insurance_types ───────────────────────────────────────────────────────────
CREATE TABLE `insurance_types` (
  `id`          bigint       NOT NULL AUTO_INCREMENT,
  `created_at`  datetime(6)  DEFAULT NULL,
  `name`        varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text         COLLATE utf8mb4_unicode_ci,
  `benefits`    text         COLLATE utf8mb4_unicode_ci,
  `rules`       text         COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_oh6db2t70imkcmadxefmejvms` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── scheduler_settings ────────────────────────────────────────────────────────
CREATE TABLE `scheduler_settings` (
  `id`                    bigint       NOT NULL,
  `enabled`               bit(1)       NOT NULL,
  `min_pending_hours`     int          NOT NULL,
  `reminder_cron`         varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `revision_cleanup_cron` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at`            datetime(6)  DEFAULT NULL,
  `verify_cron`           varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── auto_check_logs ───────────────────────────────────────────────────────────
CREATE TABLE `auto_check_logs` (
  `id`             bigint      NOT NULL AUTO_INCREMENT,
  `affected_count` int         NOT NULL,
  `ai_assisted`    bit(1)      NOT NULL,
  `check_type`     varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at`     datetime(6) DEFAULT NULL,
  `details`        text        COLLATE utf8mb4_unicode_ci,
  `status`         varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary`        text        COLLATE utf8mb4_unicode_ci,
  `total_checked`  int         NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── insurance_packages ────────────────────────────────────────────────────────
CREATE TABLE `insurance_packages` (
  `id`                      bigint        NOT NULL AUTO_INCREMENT,
  `active`                  bit(1)        NOT NULL,
  `beneficiary_info`        text          COLLATE utf8mb4_unicode_ci,
  `benefits`                text          COLLATE utf8mb4_unicode_ci,
  `coverage_max`            decimal(20,2) NOT NULL,
  `coverage_min`            decimal(20,2) NOT NULL,
  `created_at`              datetime(6)   DEFAULT NULL,
  `description`             text          COLLATE utf8mb4_unicode_ci,
  `duration_tiers`          text          COLLATE utf8mb4_unicode_ci,
  `eligibility`             text          COLLATE utf8mb4_unicode_ci,
  `exclusions`              text          COLLATE utf8mb4_unicode_ci,
  `max_claim_amount`        decimal(20,2) DEFAULT NULL,
  `min_policy_term`         int           DEFAULT NULL,
  `name`                    varchar(255)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_frequency`       varchar(20)   COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_interval_months` int           DEFAULT NULL,
  `policy_term`             int           DEFAULT NULL,
  `premium_rate`            decimal(8,4)  DEFAULT NULL,
  `required_documents`      text          COLLATE utf8mb4_unicode_ci,
  `terms_and_conditions`    text          COLLATE utf8mb4_unicode_ci,
  `type`                    varchar(255)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at`              datetime(6)   DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── payment_method_configs ────────────────────────────────────────────────────
CREATE TABLE `payment_method_configs` (
  `id`          bigint       NOT NULL AUTO_INCREMENT,
  `active`      bit(1)       NOT NULL,
  `color`       varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at`  datetime(6)  DEFAULT NULL,
  `logo_path`   varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method_key`  varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name`        varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_code_path`varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at`  datetime(6)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_f8v1i1mexy8jf3asfm7ruoep8` (`method_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── form_templates ────────────────────────────────────────────────────────────
CREATE TABLE `form_templates` (
  `id`          bigint      NOT NULL AUTO_INCREMENT,
  `active`      bit(1)      NOT NULL,
  `created_at`  datetime(6) DEFAULT NULL,
  `description` text        COLLATE utf8mb4_unicode_ci,
  `form_type`   enum('APPLICATION','CLAIM') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name`        varchar(255)COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at`  datetime(6) DEFAULT NULL,
  `package_id`  bigint      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_form_template_package_type` (`package_id`,`form_type`),
  CONSTRAINT `FK14moxcmd442vkxklapffmkus2` FOREIGN KEY (`package_id`) REFERENCES `insurance_packages` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── form_fields ───────────────────────────────────────────────────────────────
CREATE TABLE `form_fields` (
  `id`            bigint      NOT NULL AUTO_INCREMENT,
  `field_label`   varchar(255)COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_options` text        COLLATE utf8mb4_unicode_ci,
  `field_type`    enum('LABEL','NAME','EMAIL','PHONE','TEXT','TEXTAREA','CHECKBOX','DATE','NRC','IMAGE_UPLOAD','PDF_UPLOAD') COLLATE utf8mb4_unicode_ci NOT NULL,
  `required`      bit(1)      NOT NULL,
  `sort_order`    int         DEFAULT NULL,
  `template_id`   bigint      NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK68c4qtkb6rfbcrfwuj2urvwim` (`template_id`),
  CONSTRAINT `FK68c4qtkb6rfbcrfwuj2urvwim` FOREIGN KEY (`template_id`) REFERENCES `form_templates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── policy_applications ───────────────────────────────────────────────────────
CREATE TABLE `policy_applications` (
  `id`                bigint        NOT NULL AUTO_INCREMENT,
  `admin_note`        text          COLLATE utf8mb4_unicode_ci,
  `admin_signature`   longtext      COLLATE utf8mb4_unicode_ci,
  `admin_signed_at`   datetime(6)    DEFAULT NULL,
  `agent_note`        text          COLLATE utf8mb4_unicode_ci,
  `agent_signature`   longtext      COLLATE utf8mb4_unicode_ci,
  `agent_signed_at`   datetime(6)    DEFAULT NULL,
  `common_info`       text          COLLATE utf8mb4_unicode_ci,
  `coverage_amount`   decimal(20,2) NOT NULL,
  `created_at`        datetime(6)   DEFAULT NULL,
  `documents_path`    text          COLLATE utf8mb4_unicode_ci,
  `duration`          int           NOT NULL,
  `extra_info`        text          COLLATE utf8mb4_unicode_ci,
  `form_data`         text          COLLATE utf8mb4_unicode_ci,
  `notes`             text          COLLATE utf8mb4_unicode_ci,
  `policy_number`     varchar(50)   COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `premium_amount`    decimal(20,2) DEFAULT NULL,
  `revision_deadline` datetime(6)   DEFAULT NULL,
  `risk_level`        varchar(10)   COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status`            enum('PENDING','VERIFIED','APPROVED','REJECTED','CANCELLED','REVISION_REQUESTED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at`        datetime(6)   DEFAULT NULL,
  `agent_id`          bigint        DEFAULT NULL,
  `customer_id`       bigint        NOT NULL,
  `package_id`        bigint        NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKpmnamrr9b8k6ns7vy2xew0hy4` (`agent_id`),
  KEY `FK2hutrb5fsky4hf7tbm9sn35ie` (`customer_id`),
  KEY `FKsgj4fof1fnosv8rq4xesvy7i0` (`package_id`),
  CONSTRAINT `FK2hutrb5fsky4hf7tbm9sn35ie` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKpmnamrr9b8k6ns7vy2xew0hy4` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKsgj4fof1fnosv8rq4xesvy7i0` FOREIGN KEY (`package_id`) REFERENCES `insurance_packages` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── payments ──────────────────────────────────────────────────────────────────
CREATE TABLE `payments` (
  `id`                           bigint        NOT NULL AUTO_INCREMENT,
  `amount`                       decimal(20,2) DEFAULT NULL,
  `created_at`                   datetime(6)   DEFAULT NULL,
  `notes`                        varchar(255)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method`               varchar(255)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_type`                 varchar(255)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `period_label`                 varchar(30)   COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `period_number`                int           DEFAULT NULL,
  `screenshot_path`              varchar(255)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status`                       enum('PENDING','VERIFIED','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transaction_amount`           decimal(20,2) DEFAULT NULL,
  `transaction_last_six_digits`  varchar(6)    COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at`                   datetime(6)   DEFAULT NULL,
  `verified_by`                  varchar(255)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `application_id`               bigint        NOT NULL,
  `customer_id`                  bigint        NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKdeaqlpxpp5n0x8ikobjuoqikl` (`application_id`),
  KEY `FKd1qot1f3alweegm6ledjow6nj` (`customer_id`),
  CONSTRAINT `FKd1qot1f3alweegm6ledjow6nj` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKdeaqlpxpp5n0x8ikobjuoqikl` FOREIGN KEY (`application_id`) REFERENCES `policy_applications` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── claims ────────────────────────────────────────────────────────────────────
CREATE TABLE `claims` (
  `id`                bigint        NOT NULL AUTO_INCREMENT,
  `admin_note`        text          COLLATE utf8mb4_unicode_ci,
  `admin_signature`   longtext      COLLATE utf8mb4_unicode_ci,
  `admin_signed_at`   datetime(6)    DEFAULT NULL,
  `agent_note`        text          COLLATE utf8mb4_unicode_ci,
  `agent_signature`   longtext      COLLATE utf8mb4_unicode_ci,
  `agent_signed_at`   datetime(6)    DEFAULT NULL,
  `amount`            decimal(20,2) NOT NULL,
  `claim_type`        varchar(255)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at`        datetime(6)   DEFAULT NULL,
  `description`       text          COLLATE utf8mb4_unicode_ci,
  `documents_path`    varchar(255)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_data`         text          COLLATE utf8mb4_unicode_ci,
  `incident_date`     date          DEFAULT NULL,
  `revision_deadline` datetime(6)   DEFAULT NULL,
  `status`            enum('PENDING','VERIFIED','APPROVED','REJECTED','REVISION_REQUESTED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at`        datetime(6)   DEFAULT NULL,
  `agent_id`          bigint        DEFAULT NULL,
  `application_id`    bigint        NOT NULL,
  `customer_id`       bigint        NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKdklxndjl72peqs3a0hje32dqu` (`agent_id`),
  KEY `FK7rx6b1qpcks4w1ayeglbvvslj` (`application_id`),
  KEY `FK1112dl0wn9t5rmmri551xmayo` (`customer_id`),
  CONSTRAINT `FK1112dl0wn9t5rmmri551xmayo` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK7rx6b1qpcks4w1ayeglbvvslj` FOREIGN KEY (`application_id`) REFERENCES `policy_applications` (`id`),
  CONSTRAINT `FKdklxndjl72peqs3a0hje32dqu` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── feedbacks ─────────────────────────────────────────────────────────────────
CREATE TABLE `feedbacks` (
  `id`          bigint      NOT NULL AUTO_INCREMENT,
  `category`    varchar(255)COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at`  datetime(6) DEFAULT NULL,
  `message`     text        COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating`      int         NOT NULL,
  `is_read`     bit(1)      DEFAULT NULL,
  `customer_id` bigint      NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK8kw5agn6ypgg4lkjrbc54wk0c` (`customer_id`),
  CONSTRAINT `FK8kw5agn6ypgg4lkjrbc54wk0c` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE `notifications` (
  `id`           bigint      NOT NULL AUTO_INCREMENT,
  `created_at`   datetime(6) DEFAULT NULL,
  `message`      text        COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read`      bit(1)      DEFAULT NULL,
  `target_role`  varchar(255)COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title`        varchar(255)COLLATE utf8mb4_unicode_ci NOT NULL,
  `type`         enum('INFO','APPROVAL','REJECTION','PAYMENT','CLAIM','REMINDER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_id` bigint      NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKqqnsjxlwleyjbxlmm213jaj3f` (`recipient_id`),
  KEY `idx_notifications_recipient_read` (`recipient_id`, `is_read`),
  CONSTRAINT `FKqqnsjxlwleyjbxlmm213jaj3f` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Supplemental performance indexes ─────────────────────────────────────────
-- MySQL 8 does not support CREATE INDEX IF NOT EXISTS.
-- These are added via start-backend.sh on fresh installs; see that script for the idempotent form.
CREATE INDEX `idx_applications_status`          ON `policy_applications` (`status`);
CREATE INDEX `idx_claims_status`                ON `claims` (`status`);
CREATE INDEX `idx_payments_status`              ON `payments` (`status`);
CREATE INDEX `idx_feedbacks_is_read`            ON `feedbacks` (`is_read`);
CREATE INDEX `idx_notifications_recipient_read` ON `notifications` (`recipient_id`, `is_read`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Sample seed data — Agents & Customers
-- Passwords: Agent@123 (agents) | Customer@123 (customers)  [BCrypt, cost 10]
-- Safe to re-import: INSERT IGNORE skips rows whose email already exists.
-- ─────────────────────────────────────────────────────────────────────────────

