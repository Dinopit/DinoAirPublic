# DinoAir GDPR/CCPA Compliance Guide

**Last Updated:** July 28, 2025

## Overview

This document outlines DinoAir's compliance with the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), including procedures for handling user rights requests and maintaining compliance.

## GDPR Compliance

### Legal Basis for Processing

#### Article 6 - Lawfulness of Processing

1. **Contract (Article 6(1)(b))**
   - User authentication and account management
   - Chat service provision
   - Data storage and retrieval

2. **Legitimate Interest (Article 6(1)(f))**
   - System security and fraud prevention
   - Service improvement and optimization
   - Technical support and debugging

3. **Consent (Article 6(1)(a))**
   - Optional analytics and telemetry
   - Marketing communications (if implemented)
   - Non-essential feature usage tracking

4. **Legal Obligation (Article 6(1)(c))**
   - Data retention for legal compliance
   - Response to lawful requests
   - Regulatory reporting requirements

### Data Subject Rights

#### Right of Access (Article 15)

**Implementation**:
- Self-service data export in Settings > Data & Privacy
- API endpoint: `GET /api/privacy/export`
- Response time: Within 1 month (extendable to 3 months for complex requests)

**Data Provided**:
- All personal data we hold
- Purposes of processing
- Categories of data
- Recipients of data
- Retention periods
- Source of data (if not collected directly)

#### Right to Rectification (Article 16)

**Implementation**:
- Profile editing in user settings
- API endpoint: `PUT /api/users/profile`
- Real-time updates across all systems

**Scope**:
- User profile information
- Preferences and settings
- Contact information
- Correction of inaccurate data

#### Right to Erasure (Article 17)

**Implementation**:
- Self-service deletion in Settings > Data & Privacy
- API endpoint: `DELETE /api/privacy/delete`
- Complete account deletion option

**Exceptions**:
- Legal compliance requirements
- Freedom of expression and information
- Public interest in public health
- Archiving purposes in the public interest

**Process**:
1. User initiates deletion request
2. Identity verification
3. 30-day grace period for recovery
4. Permanent deletion with audit trail
5. Confirmation to user

#### Right to Data Portability (Article 20)

**Implementation**:
- Structured data export (JSON format)
- API endpoint: `GET /api/privacy/export?format=portable`
- Machine-readable format

**Data Included**:
- User profile data
- Chat history and preferences
- Settings and configurations
- Metadata and timestamps

#### Right to Object (Article 21)

**Implementation**:
- Granular consent management
- Opt-out mechanisms for each processing purpose
- Easy withdrawal of consent

**Scope**:
- Direct marketing (if applicable)
- Profiling for marketing
- Processing based on legitimate interest
- Automated decision-making

#### Rights Related to Automated Decision-Making (Article 22)

**Current Status**: DinoAir does not engage in automated decision-making that produces legal effects or significantly affects users.

**Safeguards**:
- Human oversight of AI responses
- No automated profiling for legal decisions
- Transparency about AI model behavior
- User control over AI interactions

### Data Protection by Design and Default

#### Technical Measures
- Encryption at rest and in transit
- Pseudonymization where possible
- Access controls and authentication
- Regular security assessments

#### Organizational Measures
- Privacy impact assessments
- Data protection training
- Incident response procedures
- Regular compliance audits

### Data Protection Impact Assessment (DPIA)

**Triggers for DPIA**:
- New data processing activities
- High-risk processing operations
- Use of new technologies
- Large-scale processing of sensitive data

**DPIA Process**:
1. Systematic description of processing
2. Assessment of necessity and proportionality
3. Risk assessment for data subjects
4. Mitigation measures identification
5. Consultation with DPO and stakeholders

### International Data Transfers

**Current Status**: Data processing occurs locally with minimal international transfers.

**Safeguards**:
- Standard Contractual Clauses (SCCs) for service providers
- Adequacy decisions where applicable
- Binding Corporate Rules (if applicable)
- Explicit consent for specific transfers

## CCPA Compliance

### Consumer Rights

#### Right to Know (CCPA Section 1798.100)

**Categories of Personal Information**:
- Identifiers (email, name, user ID)
- Commercial information (usage patterns, preferences)
- Internet or electronic network activity (chat interactions, API usage)
- Professional or employment-related information (if provided)

**Business Purposes**:
- Service provision and maintenance
- Security and fraud prevention
- Quality assurance and improvement
- Customer support

#### Right to Delete (CCPA Section 1798.105)

**Implementation**: Same as GDPR Right to Erasure

**Exceptions**:
- Complete or continue transaction
- Detect security incidents
- Debug to identify and repair errors
- Exercise free speech rights
- Comply with legal obligations

#### Right to Opt-Out (CCPA Section 1798.120)

**Current Status**: DinoAir does not sell personal information.

**Implementation**:
- Clear "Do Not Sell My Personal Information" notice
- Opt-out mechanism (if selling occurs in future)
- Third-party disclosure controls

#### Right to Non-Discrimination (CCPA Section 1798.125)

**Policy**: DinoAir does not discriminate against consumers who exercise their CCPA rights.

**Prohibited Actions**:
- Denying goods or services
- Charging different prices or rates
- Providing different quality of service
- Suggesting different prices or quality

### CCPA Disclosures

#### Privacy Policy Disclosures
- Categories of personal information collected
- Sources of personal information
- Business purposes for collection
- Categories of third parties with whom we share
- Consumer rights and how to exercise them

#### Collection Notice
- Categories of personal information to be collected
- Purposes for collection and use
- Link to privacy policy

### Consumer Request Handling

#### Verification Process
1. Email verification for account holders
2. Additional verification for sensitive requests
3. Identity verification for non-account holders
4. Authorized agent verification procedures

#### Response Timeframes
- Acknowledgment: Within 10 business days
- Response: Within 45 calendar days (extendable to 90 days)
- Free responses: Up to 2 requests per 12-month period

## Compliance Procedures

### Privacy Rights Request Handling

#### Request Intake
- Online form in Settings > Data & Privacy
- Email to privacy@dinoair.com
- Phone support (if available)
- Postal mail (for formal requests)

#### Request Processing Workflow
1. **Receipt and Acknowledgment** (Day 1)
   - Log request in compliance system
   - Send acknowledgment to requester
   - Assign unique request ID

2. **Identity Verification** (Days 2-5)
   - Verify requester identity
   - Confirm account ownership
   - Validate authorized agent (if applicable)

3. **Request Assessment** (Days 6-10)
   - Determine applicable rights and laws
   - Assess feasibility and exceptions
   - Identify required data sources

4. **Data Collection and Processing** (Days 11-25)
   - Query all relevant systems
   - Compile and format data
   - Apply necessary redactions

5. **Review and Quality Assurance** (Days 26-30)
   - Legal review of response
   - Technical validation of data
   - Final approval from DPO

6. **Response Delivery** (Days 31-45)
   - Secure delivery of response
   - Follow-up confirmation
   - Request closure documentation

### Consent Management

#### Consent Collection
- Clear and specific consent requests
- Granular consent options
- Easy-to-understand language
- Prominent consent mechanisms

#### Consent Records
- Timestamp of consent
- Method of consent collection
- Specific purposes consented to
- Consent withdrawal records

#### Consent Withdrawal
- Easy withdrawal mechanisms
- Same ease as giving consent
- Immediate effect of withdrawal
- Confirmation of withdrawal

### Data Breach Response

#### Detection and Assessment (0-24 hours)
1. Incident identification and containment
2. Initial impact assessment
3. Breach classification
4. Stakeholder notification

#### Investigation and Mitigation (24-72 hours)
1. Detailed forensic investigation
2. Root cause analysis
3. Mitigation measures implementation
4. Evidence preservation

#### Notification and Reporting (72 hours - 30 days)
1. Regulatory notification (within 72 hours for GDPR)
2. Individual notification (without undue delay)
3. Public disclosure (if required)
4. Ongoing communication

#### Recovery and Lessons Learned (30+ days)
1. System restoration and monitoring
2. Process improvements
3. Training updates
4. Compliance review

### Compliance Monitoring

#### Regular Audits
- Quarterly privacy compliance reviews
- Annual third-party assessments
- Continuous monitoring systems
- Risk assessment updates

#### Key Performance Indicators
- Privacy request response times
- Data retention compliance rates
- Consent management effectiveness
- Security incident frequency

#### Training and Awareness
- Regular staff privacy training
- Privacy by design workshops
- Compliance update communications
- External privacy education

### Documentation and Records

#### Required Documentation
- Privacy impact assessments
- Data processing records
- Consent management logs
- Privacy request handling records
- Breach incident reports

#### Retention Periods
- Privacy requests: 3 years
- Consent records: 3 years after withdrawal
- Breach records: 5 years
- Training records: 3 years

## Contact Information

### Data Protection Officer
- **Email**: dpo@dinoair.com
- **Role**: Privacy compliance oversight
- **Responsibilities**: GDPR compliance, privacy impact assessments, training

### Privacy Team
- **Email**: privacy@dinoair.com
- **Response Time**: 10 business days for acknowledgment
- **Languages**: English (primary), additional languages upon request

### Regulatory Contacts
- **EU Supervisory Authority**: [To be determined based on establishment]
- **California Attorney General**: privacy@oag.ca.gov
- **Other Jurisdictions**: As applicable based on user location

---

This compliance guide is reviewed and updated quarterly to ensure ongoing compliance with evolving privacy regulations.
