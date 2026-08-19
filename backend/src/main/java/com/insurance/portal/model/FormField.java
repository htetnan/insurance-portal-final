package com.insurance.portal.model;

import com.insurance.portal.model.enums.FieldType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "form_fields")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private FormTemplate template;

    @Column(name = "field_label", nullable = false)
    private String fieldLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false)
    private FieldType fieldType;

    /** For CHECKBOX: JSON array of option strings, e.g. ["Yes","No"] or ["Option A","Option B"] */
    @Column(name = "field_options", columnDefinition = "TEXT")
    private String fieldOptions;

    @Builder.Default
    private boolean required = false;

    @Column(name = "sort_order")
    private int sortOrder;
}
