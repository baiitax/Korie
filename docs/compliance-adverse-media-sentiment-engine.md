# Adverse Media Sentiment & News Surveillance Engine

## Ingestion Pipelines
- Global RSS and API feeds from reputable news publications, financial regulators (CBN, BCEAO, SEC, EFCC, CENTIF), and legal gazettes.
- Local Northern Nigeria & Niger Republic regional news outlets (Daily Trust, Leadership, Le Sahel, Journal Officiel).

## NLP Entity Resolution & Matching
- Articles are parsed using named entity recognition (NER) for person, organization, and geographic names.
- Articles matched against active KoriePay customers and merchants are tagged with sentiment severity (`HIGH_RISK_FINANCIAL_CRIME`, `REGULATORY_ALERT`, `HIGH_RISK_IDENTITY_FRAUD`) and presented in the Adverse Media Desk for investigator review.
