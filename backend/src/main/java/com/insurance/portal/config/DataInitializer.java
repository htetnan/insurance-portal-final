package com.insurance.portal.config;

import com.insurance.portal.model.InsurancePackage;
import com.insurance.portal.model.InsuranceType;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.Role;
import com.insurance.portal.repository.InsurancePackageRepository;
import com.insurance.portal.repository.InsuranceTypeRepository;
import com.insurance.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final InsurancePackageRepository packageRepo;
    private final InsuranceTypeRepository insuranceTypeRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedInsuranceTypes();
        seedPackages();
        seedDemoUsers();
    }

    private void seedInsuranceTypes() {
        if (insuranceTypeRepo.count() > 0) return;
        List<String> defaults = List.of("LIFE", "HEALTH", "VEHICLE", "PROPERTY");
        defaults.forEach(name -> insuranceTypeRepo.save(InsuranceType.builder().name(name).build()));
        log.info("✅ Seeded {} default insurance types", defaults.size());
    }

    private void seedPackages() {
        // Re-seed if only the old-style packages exist (missing durationTiersJson)
        long existing = packageRepo.count();
        if (existing > 0) {
            boolean anyHasTiers = packageRepo.findAll().stream()
                    .anyMatch(p -> p.getDurationTiersJson() != null && !p.getDurationTiersJson().isBlank());
            if (anyHasTiers) return; // already have fully-featured packages
            // Wipe incomplete seed data so we can re-seed properly
            packageRepo.deleteAll();
            log.info("⚠️ Removed {} incomplete seed packages — re-seeding with full data", existing);
        }

        List<InsurancePackage> packages = List.of(

            // ── Life Insurance ──────────────────────────────────────────────
            InsurancePackage.builder()
                .name("Basic Life Protection")
                .type("LIFE")
                .description("Essential life coverage for individuals and families. Affordable premiums with a reliable death benefit payout.")
                .coverageMin(new BigDecimal("5000000.00"))
                .coverageMax(new BigDecimal("50000000.00"))
                .maxClaimAmount(new BigDecimal("50000000.00"))
                .durationTiersJson("[{\"years\":1,\"premiumRate\":0.0200},{\"years\":2,\"premiumRate\":0.0190},{\"years\":3,\"premiumRate\":0.0185},{\"years\":5,\"premiumRate\":0.0175}]")
                .paymentFrequency("YEARLY")
                .paymentIntervalMonths(12)
                .benefitsJson("Death benefit payout to named beneficiary\nAccidental death double indemnity\nTotal permanent disability benefit\n24/7 customer support hotline\nDigital policy documents & e-certificate")
                .eligibility("Age 18–60 years at time of application.\nMyanmar citizen or permanent resident.\nNo terminal illness or life-threatening condition at application date.\nMust pass basic health declaration form.")
                .exclusions("Suicide within the first 2 years of the policy.\nDeath caused by war, terrorism, or civil unrest.\nPre-existing conditions not declared at application.\nDeath while under the influence of alcohol or illegal substances.")
                .beneficiaryInfo("The policyholder may designate one or more beneficiaries.\nBeneficiaries must be named at policy inception or updated in writing.\nMinor beneficiaries require a legal guardian to receive the payout.\nIn the absence of a named beneficiary, proceeds go to the legal estate.")
                .termsAndConditions("1. POLICY TERM: This policy is valid for the selected duration from the activation date.\n2. PREMIUM PAYMENT: Premiums must be paid annually by the due date. A 30-day grace period applies.\n3. LAPSE: Failure to pay within the grace period will lapse the policy without cash value.\n4. REINSTATEMENT: A lapsed policy may be reinstated within 2 years subject to a health re-declaration.\n5. CLAIMS: All claims must be submitted within 90 days of the insured event with supporting documentation.\n6. CONTESTABILITY: The insurer reserves the right to contest claims within 2 years of policy inception if material misrepresentation is found.\n7. GOVERNING LAW: This policy is governed by the laws of Myanmar.")
                .requiredDocumentsJson("[\"National Registration Card (NRC) — front and back copy\",\"Passport-size photograph (2 copies)\",\"Completed health declaration form\",\"Bank account details for premium debit\"]")
                .active(true).build(),

            InsurancePackage.builder()
                .name("Premium Life Shield")
                .type("LIFE")
                .description("Comprehensive life coverage with added riders for critical illness and disability. Ideal for breadwinners and high-value protection needs.")
                .coverageMin(new BigDecimal("20000000.00"))
                .coverageMax(new BigDecimal("200000000.00"))
                .maxClaimAmount(new BigDecimal("200000000.00"))
                .durationTiersJson("[{\"years\":5,\"premiumRate\":0.0250},{\"years\":10,\"premiumRate\":0.0240},{\"years\":15,\"premiumRate\":0.0230},{\"years\":20,\"premiumRate\":0.0220}]")
                .paymentFrequency("MONTHLY")
                .paymentIntervalMonths(1)
                .benefitsJson("Death benefit payout to named beneficiary\nCritical illness rider — covers 10 major illnesses\nAccidental death & total permanent disability benefit\nFree annual health screening (clinic partner network)\nWaiver of premium on disability\nDigital policy documents & e-certificate")
                .eligibility("Age 18–55 years at time of application.\nMyanmar citizen or permanent resident.\nMust complete full medical underwriting for coverage above MMK 100,000,000.\nNon-smoker preferred rate available.")
                .exclusions("Suicide within the first 2 years of the policy.\nDeath caused by war, terrorism, or civil unrest.\nPre-existing critical illnesses diagnosed before policy inception.\nHazardous activities (skydiving, mountaineering) unless additional rider purchased.\nAlcohol or drug-related deaths.")
                .beneficiaryInfo("Up to 3 beneficiaries may be named with percentage allocation.\nBeneficiary details can be updated at any anniversary date.\nJoint-life option available for married couples.\nTrustee appointment available for minor beneficiaries.")
                .termsAndConditions("1. POLICY TERM: 5, 10, 15, or 20 years from activation date.\n2. PREMIUM PAYMENT: Monthly via direct debit. A 30-day grace period applies.\n3. CRITICAL ILLNESS CLAIM: Diagnosed illness must survive 30 days after diagnosis to trigger the rider payout.\n4. LAPSE & REINSTATEMENT: Policy lapses after the grace period. Reinstatement within 2 years with fresh medical evidence.\n5. FREE-LOOK PERIOD: 14 days from policy delivery to cancel for a full refund.\n6. CLAIMS PROCEDURE: Submit certified medical reports, death certificate (if applicable), and claim form within 90 days.\n7. GOVERNING LAW: Governed by the laws of Myanmar.")
                .requiredDocumentsJson("[\"National Registration Card (NRC) — front and back copy\",\"Passport-size photograph (2 copies)\",\"Completed health declaration & medical questionnaire\",\"Income proof (payslip or business registration) for high-sum assured\",\"Bank account details for premium debit\"]")
                .active(true).build(),

            // ── Health Insurance ─────────────────────────────────────────────
            InsurancePackage.builder()
                .name("Health Plus")
                .type("HEALTH")
                .description("Full medical coverage including hospitalization, outpatient care, surgery, and emergency evacuation. Perfect for individuals and families.")
                .coverageMin(new BigDecimal("2000000.00"))
                .coverageMax(new BigDecimal("30000000.00"))
                .maxClaimAmount(new BigDecimal("30000000.00"))
                .durationTiersJson("[{\"years\":1,\"premiumRate\":0.0280},{\"years\":2,\"premiumRate\":0.0265},{\"years\":3,\"premiumRate\":0.0250}]")
                .paymentFrequency("QUARTERLY")
                .paymentIntervalMonths(3)
                .benefitsJson("Hospitalization — room, board & ICU costs\nOutpatient treatment & specialist consultations\nSurgery & anaesthesia coverage\nEmergency medical evacuation\nMaternity & new-born care benefits\nPrescription drug reimbursement up to MMK 500,000/year\nDental emergency coverage")
                .eligibility("Age 1–65 years (children must be added under a family plan).\nMyanmar citizen or resident with valid address.\nNo hospitalization for chronic illness in the past 12 months at application.\nPre-existing conditions covered after a 12-month waiting period.")
                .exclusions("Cosmetic or elective procedures not medically necessary.\nExperimental treatments not approved by MOH Myanmar.\nSelf-inflicted injuries.\nAlcohol or substance abuse treatment.\nDental treatments other than emergency extractions.\nSTDs and HIV/AIDS-related treatment.")
                .beneficiaryInfo("Health plans cover the named policyholder only unless a Family Floater option is selected.\nFamily Floater covers spouse and up to 3 dependent children.\nEach member uses a shared pool of the total coverage amount per policy year.\nAdding a new dependent requires written notice within 30 days of the qualifying event.")
                .termsAndConditions("1. COVERAGE YEAR: Benefits reset on each policy anniversary date.\n2. PRE-AUTHORIZATION: Planned surgeries and specialist referrals require pre-authorization at least 48 hours in advance.\n3. CASHLESS CLAIMS: Available at network hospitals — present your e-card at admission.\n4. REIMBURSEMENT CLAIMS: Submit receipts within 60 days of treatment for out-of-network claims.\n5. WAITING PERIOD: 30-day general waiting period; 12 months for pre-existing conditions; 9 months for maternity.\n6. CO-PAYMENT: 10% co-payment applies to outpatient claims.\n7. RENEWAL: Policy must be renewed before expiry. Premium may be revised at renewal based on claims history.")
                .requiredDocumentsJson("[\"National Registration Card (NRC) — front and back copy\",\"Passport-size photograph\",\"Completed health declaration form\",\"Birth certificate (for dependent children)\",\"Medical records for any pre-existing condition declared\"]")
                .active(true).build(),

            // ── Vehicle Insurance ────────────────────────────────────────────
            InsurancePackage.builder()
                .name("Vehicle Protect Plus")
                .type("VEHICLE")
                .description("Comprehensive vehicle insurance for cars, motorcycles, and commercial vehicles. Covers accidents, theft, fire, flood, and third-party liability.")
                .coverageMin(new BigDecimal("3000000.00"))
                .coverageMax(new BigDecimal("80000000.00"))
                .maxClaimAmount(new BigDecimal("80000000.00"))
                .durationTiersJson("[{\"years\":1,\"premiumRate\":0.0300},{\"years\":2,\"premiumRate\":0.0285},{\"years\":3,\"premiumRate\":0.0270}]")
                .paymentFrequency("YEARLY")
                .paymentIntervalMonths(12)
                .benefitsJson("Accident repair costs — own vehicle damage\nTotal loss replacement (declared write-off)\nTheft & attempted theft coverage\nThird-party bodily injury & property liability\nRoadside assistance 24/7 (towing up to 50 km)\nFire and flood (natural disaster) damage\nPersonal accident cover for driver (MMK 5,000,000)")
                .eligibility("Vehicle registered in Myanmar with valid road-tax.\nDriver must hold a valid Myanmar driving licence.\nVehicles up to 10 years old at inception (older vehicles subject to inspection).\nCommercial vehicles (taxis, delivery vans) must declare commercial use.")
                .exclusions("Damage caused while driving under the influence of alcohol or drugs.\nWear and tear, mechanical or electrical breakdown.\nUsing the vehicle in a race, rally, or speed test.\nIntentional damage by the policyholder.\nDamage occurring outside Myanmar unless international cover rider is purchased.\nConsequential losses (loss of earnings during repair).")
                .beneficiaryInfo("The vehicle owner is the default beneficiary for own-damage claims.\nThird-party claims are paid directly to the injured party or their legal representative.\nIn the event of total loss, settlement is based on the vehicle's market value at the time of loss minus any depreciation.\nFinance companies with a registered interest will be noted on the policy as co-payees.")
                .termsAndConditions("1. VEHICLE INSPECTION: An inspection may be required before cover is bound for vehicles over 5 years old or with prior damage.\n2. ACCIDENT CLAIMS: Notify us within 24 hours of an accident. Do not authorize repairs without written approval.\n3. THEFT CLAIMS: Report theft to the nearest police station and obtain a police report within 24 hours.\n4. APPROVED REPAIRERS: Use our network of approved repair workshops for cashless service.\n5. EXCESS: A standard excess of MMK 500,000 applies per own-damage claim.\n6. NO-CLAIM DISCOUNT (NCD): A 10% NCD applies on renewal for each claim-free year, up to 30%.\n7. CANCELLATION: Midterm cancellation refunds the pro-rata unused premium less a 10% administration fee.")
                .requiredDocumentsJson("[\"Vehicle registration certificate (front & back)\",\"Valid road-tax sticker\",\"Driver's licence of the named driver\",\"Chassis and engine number photographs\",\"National Registration Card (NRC) of the owner\",\"Existing damage photographs (if any)\"]")
                .active(true).build(),

            // ── Property Insurance ───────────────────────────────────────────
            InsurancePackage.builder()
                .name("Home & Property Shield")
                .type("PROPERTY")
                .description("Protect your home and valuables against fire, theft, natural disasters, and accidental damage. Comprehensive coverage for homeowners and landlords.")
                .coverageMin(new BigDecimal("10000000.00"))
                .coverageMax(new BigDecimal("500000000.00"))
                .maxClaimAmount(new BigDecimal("500000000.00"))
                .durationTiersJson("[{\"years\":1,\"premiumRate\":0.0150},{\"years\":2,\"premiumRate\":0.0142},{\"years\":3,\"premiumRate\":0.0135},{\"years\":5,\"premiumRate\":0.0125}]")
                .paymentFrequency("YEARLY")
                .paymentIntervalMonths(12)
                .benefitsJson("Structural damage — fire, earthquake, flood, storm\nContents & household belongings coverage\nTheft and burglary — forcible entry\nAccidental breakage (glass, sanitary ware)\nTemporary accommodation allowance (up to 90 days)\nLandlord liability coverage\nRent loss coverage (for landlords)\nEmergency home assistance (plumber, electrician)")
                .eligibility("Property must be located in Myanmar and used for residential purposes.\nBuilding must be constructed of permanent materials (brick, concrete, steel).\nApplicant must be the legal owner or authorized tenant.\nProperty must not have been subject to a claim in the past 3 years for the same peril unless repairs are certified.")
                .exclusions("Gradual deterioration, wear and tear, or rust.\nDamage caused by insects, vermin, or fungus.\nWar, invasion, or acts of foreign enemies.\nNuclear radiation or contamination.\nIntentional damage or fraud by the insured.\nUninhabited properties (vacant for more than 60 days without prior notification).")
                .beneficiaryInfo("The named insured (owner or tenant) is the primary beneficiary.\nMortgagee (bank or finance company) may be noted as a co-payee for the building section.\nContents coverage applies to personal belongings of the named insured and immediate family members residing at the property.\nHigh-value items (jewellery, art, electronics) over MMK 5,000,000 must be individually listed to be covered.")
                .termsAndConditions("1. SUM INSURED BASIS: The building is insured on a reinstatement basis; contents on indemnity (market value) basis.\n2. AVERAGE CLAUSE: If the sum insured is below 80% of the replacement value, claims will be proportionally reduced.\n3. CLAIMS NOTIFICATION: Notify the insurer within 48 hours of a loss event. Do not dispose of damaged property before inspection.\n4. PROOF OF LOSS: Submit itemized list of damaged/lost property with purchase receipts where available within 30 days.\n5. TEMPORARY ACCOMMODATION: Pre-approval required. Maximum MMK 2,000,000/month for up to 90 days.\n6. PREMIUM PAYMENT: Annual premium due on the policy start date. 30-day grace period before cover lapses.\n7. GOVERNING LAW: Governed by the laws of Myanmar.")
                .requiredDocumentsJson("[\"Property ownership certificate or land title deed\",\"National Registration Card (NRC) of the owner\",\"Photographs of the property — exterior and all rooms\",\"Proof of tenancy (if applicable)\",\"List of high-value contents to be specifically insured\",\"Previous insurance certificate (if renewing)\"]")
                .active(true).build(),

            InsurancePackage.builder()
                .name("SME Business Protect")
                .type("PROPERTY")
                .description("Business interruption and multi-risk asset protection designed for small and medium enterprises. Keep your business running through unexpected events.")
                .coverageMin(new BigDecimal("50000000.00"))
                .coverageMax(new BigDecimal("1000000000.00"))
                .maxClaimAmount(new BigDecimal("1000000000.00"))
                .durationTiersJson("[{\"years\":1,\"premiumRate\":0.0180},{\"years\":2,\"premiumRate\":0.0170},{\"years\":3,\"premiumRate\":0.0160}]")
                .paymentFrequency("HALF_YEARLY")
                .paymentIntervalMonths(6)
                .benefitsJson("Business interruption — lost revenue during forced closure\nBuilding & fitout damage (fire, flood, storm)\nMachinery, equipment & stock coverage\nTheft, robbery & employee dishonesty\nPublic & product liability protection\nEmployee personal accident (up to 20 staff)\nElectronic equipment & data loss coverage\nMoney in transit & on premises")
                .eligibility("Registered business entity in Myanmar (sole proprietor, partnership, or company).\nAnnual turnover up to MMK 10 billion.\nBusiness premises must be permanently constructed and maintained in good condition.\nBusiness must have been operating for at least 6 months.\nFood & beverage and manufacturing businesses require on-site risk assessment.")
                .exclusions("Losses arising from intentional acts, fraud, or dishonesty of the owner/directors.\nBusiness interruption due to contractual disputes or government penalties.\nCyber-attacks unless cyber-liability extension is purchased.\nStock spoilage due to power failure unless consequential loss rider is added.\nWar, terrorism, nuclear risks.\nLiability arising from professional advice (requires separate professional indemnity cover).")
                .beneficiaryInfo("The named insured business entity is the sole beneficiary for first-party covers.\nLiability claims are settled directly with the third-party claimant.\nIn the event of a business interruption claim, benefits are calculated on the basis of the Gross Profit declared at inception — ensure this figure is accurate.\nPartners or co-directors listed on the policy are covered for personal accident benefits.")
                .termsAndConditions("1. BUSINESS INTERRUPTION: The indemnity period is 12 months from the date of loss. Revenue projections must be supported by 2 years of financial records.\n2. RISK ASSESSMENT: A site survey may be required for premises over MMK 200,000,000 sum insured.\n3. EMPLOYEE DISHONESTY: A 30-day discovery period applies after policy expiry.\n4. STOCK DECLARATION: Stock values must be declared quarterly; premium is adjusted at year-end on actual values.\n5. CLAIMS NOTIFICATION: Notify insurer immediately (and no later than 48 hours) of any loss. Preserve all evidence.\n6. PREMIUM PAYMENT: Half-yearly. Failure to pay the second instalment within the grace period suspends cover.\n7. GOVERNING LAW: Governed by the laws of Myanmar.")
                .requiredDocumentsJson("[\"Business registration certificate (DICA)\",\"Company NRC or directors' NRC copies\",\"Premises lease agreement or ownership deed\",\"Last 2 years financial statements (for business interruption cover)\",\"Asset register or equipment list with purchase values\",\"Photographs of premises — exterior, office, storage\"]")
                .active(true).build()
        );

        packageRepo.saveAll(packages);
        log.info("✅ Seeded {} default insurance packages with full details", packages.size());
    }

    /**
     * Provides a useful local demo dataset without affecting existing accounts.
     * Each record is checked by email so restarting localhost is idempotent.
     */
    private void seedDemoUsers() {
        String[] agentNames = {
                "Aung Kyaw Moe", "Thiri Hlaing", "Min Zaw Oo", "Ei Ei Mon"
        };
        String[] agentTypes = {"LIFE", "HEALTH", "VEHICLE", "PROPERTY"};
        for (int i = 0; i < agentNames.length; i++) {
            String email = "agent" + (i + 1) + "@dicp.com.mm";
            if (!userRepo.existsByEmail(email)) {
                userRepo.save(User.builder()
                        .name(agentNames[i])
                        .email(email)
                        .password(passwordEncoder.encode("Agent@123"))
                        .phone("+95950000" + String.format("%03d", i + 1))
                        .address("Yangon, Myanmar")
                        .role(Role.AGENT)
                        .insuranceType(agentTypes[i])
                        .active(true)
                        .build());
            }
        }

        String[] customerNames = {
                "Zaw Min Htun", "Ei Phyu Phyu", "Ye Naing Win", "Su Su Htwe",
                "Kyaw Zin Htet", "Aye Aye Khin", "Htet Aung Naing", "Nilar Oo",
                "Phyo Wai Lwin", "Thin Zar Hlaing", "Min Thura Zaw", "Hnin Wai Wai",
                "Aung Htet Oo", "Khin Mar Aye", "Wai Yan Kyaw", "Cho Cho Win",
                "Pyae Phyo Aung", "May Zin Oo", "Zin Ko Ko", "Nang Hseng Kham"
        };
        for (int i = 0; i < customerNames.length; i++) {
            String email = "customer" + (i + 1) + "@dicp.com.mm";
            if (!userRepo.existsByEmail(email)) {
                userRepo.save(User.builder()
                        .name(customerNames[i])
                        .email(email)
                        .password(passwordEncoder.encode("Customer@123"))
                        .phone("+9595100" + String.format("%04d", i + 1))
                        .address("Yangon, Myanmar")
                        .role(Role.CUSTOMER)
                        .active(true)
                        .build());
            }
        }
        log.info("✅ Ensured 4 demo agents and 20 demo customers");
    }
}
