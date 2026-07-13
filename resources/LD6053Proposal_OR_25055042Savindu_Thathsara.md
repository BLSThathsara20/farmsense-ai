

## Assessment Submission Coversheet

If you do not understand any elements of this declara3on, please speak to your module tutor.

Module code and 6tle  LD6053 UG Compu6ng Project
## Student Name  Beruwala Liyanage Savindu Thathsara
Student ID  25055042
## Total Word Count  1518

Declaration of that the submission is your own work
I confirm that:

☑ This assignment submission is my own, independent work.
☑ I have referenced the sources of information, ideas, and quotations that I have used in this
submission and listed my sources in a bibliography.

Declaration of the Use of AI tool

## EITHER
☐ I have not used AI at any point in preparing this assessment

## OR
☑ I have used AI tools (including, but not limited to ChatGPT) to help me (select all that apply):
☐ Generate initial ideas in response to the question
☑ Develop the structure
☑ Generate ideas for examples / sources
☐ Provide feedback and suggestions for improvement on my content
☐ Edit and improve my spelling and grammar
☐ Other: please explain:

☑ I have completed a reference declara3on statement as part of my reference list showing
which AI tools I have used and how I have used them.
In comple3ng this declara3on, I confirm that I have NOT used AI to generate whole sentences,
paragraphs, sec3ons, or the whole of this assessment and I understand that this would be
considered academic misconduct.

## Signed:
## Date: 06/05/2026

Table of Contents
An Intelligent Crop Planning and Market Intelligence System for Smallholder Farmers ............ 5
Abstract .................................................................................................................................. 5
1: Project Overview and MoDvaDon ........................................................................................ 5
1.1 Background and Context ............................................................................................................ 5
1.2 Problem Statement .................................................................................................................... 5
1.3 Aim ............................................................................................................................................ 6
1.4 Research QuesBons .................................................................................................................... 6
1.5 ObjecBves .................................................................................................................................. 6
2: Literature Review / Background .......................................................................................... 7
2.1 Theme 1 – Crop recommendaBon (soil - climate) ........................................................................ 7
2.2 Theme 2 – Price forecasBng and weather forecasBng ................................................................. 7
2.3 Related work – demand signals + farmer informaBon systems ................................................... 7
2.4 Summary - the gap this project addresses .................................................................................. 7
3: Requirements SpecificaDon ................................................................................................. 8
3.1 Requirements ElicitaBon ............................................................................................................ 8
3.2 FuncBonal Requirements (MoSCoW) .......................................................................................... 8
3.3 Non FuncBonal Requirements .................................................................................................... 8
3.4 Use Case Overview ..................................................................................................................... 9
4: Project Tasks and Deliverables .......................................................................................... 10
4.1 Project Plan and Timeline ......................................................................................................... 10
4.2 Resources Required .................................................................................................................. 10
4.3 Expected Deliverables and ContribuBons ................................................................................. 10
5: TesDng Strategy ................................................................................................................ 11
5.1 Proposed TesBng Approach ...................................................................................................... 11
5.2 EvaluaBon Approach ................................................................................................................ 11
5.3 Risk and MiBgaBon .................................................................................................................. 11
6: Extra ConsideraDons ......................................................................................................... 12
6.1 Research methodology ............................................................................................................. 12
6.2 Development Approach / So]ware Development Methodology ............................................... 12
6.3 Proposed System Overview ...................................................................................................... 12
6.4 Known LimitaBons ................................................................................................................... 12

7: Ethical Approval ................................................................................................................ 14
8: Evidence of Project Development ...................................................................................... 23
References ............................................................................................................................ 26
Appendix .............................................................................................................................. 27
A1  - Dataset preview ..................................................................................................................... 27
A2 - SWOT analysis ........................................................................................................................ 28
A3 - Supervisor meeBng log ........................................................................................................... 29
A4 - Literature summary table ........................................................................................................ 30




Table of Figure

Figure 1 : Use case overview .......................................................................................................... 9
Figure 2 : Project 3meline (ganY) ................................................................................................. 10
Figure 3 : ER / data model ............................................................................................................ 23
Figure 4 : FarmSense AI UI Landing page ...................................................................................... 24
Figure 5 : Market and recommenda3on details UI ....................................................................... 25
Figure 6 : Project repository file structure .................................................................................... 25
Figure 7 : A1 - Dataset preview (Crop recommenda3on) ............................................................. 27
Figure 8 : A1 - Dataset preview (Weather data) ........................................................................... 28
Figure 9 : A2 - SWOT analysis ........................................................................................................ 28
Figure 10 : A3 - Supervisor mee3ng log (27/03/26) ..................................................................... 29
Figure 11 : A3 - Supervisor mee3ng log (16/04/26) ..................................................................... 29
Figure 12 : A4 - Literature summary ............................................................................................. 30



An Intelligent Crop Planning and Market Intelligence System for
## Smallholder Farmers
## Abstract

Smallholders typically have habitual or top-down crop decisions‚ liYle access to market and
price signals and can have overproduc3on problems. Many ML recommenders only consider
soil and climate constraints while FarmSense AI develops a mobile first web app (React‚ FastAPI‚
PostgreSQL) using Random Forest suitability‚ LSTM predicted weather and price forecasts (4-10
weeks) and Natural Language Processing (NLP) demand signals (Google search trends‚ Reddit
comments posts). Deployed features include profit-ranked recommenda3ons‚ alerts at 3mes of
oversupply and sell window‚ and evalua3ons using model metrics‚ end-to-end tests‚ and short
assessments of usability.
1: Project Overview and MoBvaBon

1.1 Background and Context

Plan3ng decisions are made based on liYle or no evidence‚ and those farmers who market their
output late‚ or lack access to advice‚ experience financial losses (Springer‚ 2023). Despite a
growing number of apps for smallholder farmers‚ these typically only provide basic informa3on
and do not connect price forecas3ng with plan3ng (SAGE‚ 2021). ML scores for suitability and
yield. Weather and price series suit LSTM style models. Demand is driven by social and search
engines. Crop scores/ranking‚ plan3ng/selling date windows‚ oversupply alerts. The LD6053
FarmSense AI socware‚ built at Northumbria University London as part of 'Lensed Data Science'
project‚ provides immediate outputs a busy grower can act on in a maYer of minutes‚ not
analysis silos.

## 1.2 Problem Statement

Content is Plan3ng choces come before prices or demand are known. Limita3ons are many
tools op3mize for soil and climate only. Consequence: A herd ins3nct on the same crop can
depress returns. Gap: Some light web systems include suitability‚ weather/price forecasts‚
demand signals and district plan3ng informa3on in a profit ranked plan.




## 1.3 Aim

To design‚ build and evaluate a web based machine learning plaform for smallholders that
provides ranked plan3ng recommenda3ons based on soil condi3ons‚ short term weather and
price forecasts as well as demand signals to improve their decisions and avoid oversupply.

## 1.4 Research Ques@ons

- Does soil‚ weather‚ price‚ and demand combined outperform soil only recommenda3ons
for profit ranked recommenda3ons?
- What is the predic3ve power of Google Trends and Reddit signals for short-term crop
prices?
- Do anonymous district plan3ng paYerns improve the use of oversupply warnings?

## 1.5 Objec@ves




## 2: Literature Review / Background

2.1 Theme 1 – Crop recommenda@on (soil - climate)

Other recent work has focused on high crop-selec3on accuracy on both soil and weather
features. In Scien3fic Reports‚ high accuracy on their dataset was achieved using a model with
LSTM weather stage and Random Forest crop-selec3on stage (Scien3fic Reports‚ 2023).
Ensemble classifiers like RF‚ SVM‚ and Naive Bayes can give very strong recommenda3on
accuracy (Acharya et al. 2024)‚ but ensemble classifiers do not op3mize for apparent farmer
outcomes like profit or best sell 3me‚ but instead op3mize for the best "fit" (soil/climate). This
can s3ll result in oversupply if all farmers receive the same recommenda3on.

2.2 Theme 2 – Price forecas@ng and weather forecas@ng

Time-series forecas3ng of weather and agricultural commodity prices is common‚ but LSTM-
based methods are also popular due to modeling non-linear data. Decomposi3on + LSTM-
based models have been shown to improve forecas3ng performance for vola3le commodity
prices such as in VMD/EEMD + LSTM (Agriculture‚ 2024). The gap is not in predic3on accuracy
per se‚ but in transla3ng predic3ons into simple ac3ons (sell window‚ risk flags) that farmers
can use.

2.3 Related work – demand signals + farmer informa@on systems

Other evidence has focused on ICTs or farmer informa3on systems. This suggests that under
certain condi3ons ICTs can improve access to advice and markets‚ but that literacy‚ connec3vity‚
cost and trust may limit impacts (SAGE‚ 2021; AJIC‚ 2023). Web data‚ while not a subs3tute for
official sta3s3cs‚ can be an early indicator of demand for food commodi3es. Google Trends data
and online text can improve forecasts based on consump3on and price indicators (Politecnico di
Milano‚ 2016). FarmSense AI supplements this lightweight demand scoring with anonymised
district-level plan3ng data‚ allowing oversupply alerts to be sent without gathering personal
data.

2.4 Summary - the gap this project addresses

Some literature exists on correct crop choice from soil/climate data‚ LSTM-style forecas3ng‚ and
ICT usability/accessibility‚ but not an end-to-end mobile‚ low-resource solu3on which

incorporates suitability and expected price‚ weather factors‚ demand proxies into a single
boYom line recommenda3on/conclusion with ac3onable next steps and not just charts of
results.
3: Requirements SpecificaBon

## 3.1 Requirements Elicita@on

Sources include farmer systems and smallholder ICT literature and the module brief. No interviews
are conducted yet. Usability testing (≥3 users) follows ethical approval (Section 7).

3.2 Func@onal Requirements (MoSCoW)



## 3.3 Non Func@onal Requirements

- NFR1 - Load key sceens in approximately 3s on a typical mobile link.
- NFR2 - Data used for collec3ve features is anonymized.
- NFR3 - Suitability >85% test accuracy.
- NFR4 - Price MAPE <15% on valida3on.



## 3.4 Use Case Overview



Figure 1 : Use case overview








4: Project Tasks and Deliverables

4.1 Project Plan and Timeline



## Figure 2 : Project 5meline (gan:)

## 4.2 Resources Required

- Python 3.11, FastAPI, scikit learn, TensorFlow / Keras, HuggingFace.
- PostgreSQL, Docker, Github.
- React (Vite) frontend prototype.
- Public datasets (see references).

4.3 Expected Deliverables and Contribu@ons

The final submission will contain our trained models and a working API. In addi3on‚ our mobile
first web app and database schema will read the crops based on profit‚ alert on oversupply‚
provide sell window‚ and compare against a soil only baseline.


5: TesBng Strategy

## 5.1 Proposed Tes@ng Approach

The test plan will have unit tests after each feature‚ integration tests before you wire up the UI to your live
inference‚ system tests on key screens‚ and usability tests once the core user journey is working. Minimum
success criteria will be documented for the tests (e.g.‚ expected API status codes‚ shape of model outputs‚
metrics thresholds‚ etc.).
- Unit: pytest on preprocessing‚ inference helpers‚ and API utilities.
- Integration: the end-to-end pipeline runs from fixed inputs to known outputs.
- System: main UI paths on mobile/desktop (login -> profile -> recommendation).
- Usability: short task list with ≥3 participants (think-aloud‚ or guided tasks).
- Evidence: Keep a screenshot evidence in Section 8 / Appendix (pytest summary and API response or
Swagger/Postman screenshot along with 2-3 screenshots of the UI per flow).
## 5.2 Evalua@on Approach

An RQ is answered through performance metrics (e.g. accuracy‚ MAPE)‚ baseline comparisons
within scenarios‚ and usability feedback provided during prototype tes3ng.

5.3 Risk and Mi@ga@on

- Data / API dric – local copies and backup sources.
- Week models – alterna3ve models and tuning.
- Time – core pipeline + UI first, collec3ve engine is Should.
- Ethics – consent and anonymiza3on for usability.



6: Extra ConsideraBons

6.1 Research methodology

This project uses the design and build method because a func3oning system is the product. I
will also use small controlled experiments to answer the research ques3ons. That means I will
compare model op3ons (such as input sets or model parameter seungs) and always show a
clear baseline (i.e.‚ soil only) for comparison.

6.2 Development Approach / SoYware Development Methodology

I will use the CRISP-DM (understand‚ prepare‚ model‚ evaluate) process for the data work. My
socware will be delivered itera3vely. I will deploy one small feature and test and refine it. I will
track work-related tasks on GitHub issues and will make weekly commits.

I want to integrate as early as possible. I will wire up the API and UI and fake the outputs‚ and
when that works‚ I will switch it to using the model inference.

## 6.3 Proposed System Overview

The system has three components: (1) a web client for farmers built with React. (2) A FastAPI
backend that handles authen3ca3on and profile and recommenda3on requests and (3) a
PostgreSQL database that stores both user profiles and the anonymized aggregates needed to
warn districts.

Models run as services (Docker) and are exposed at inference endpoints. The backend makes
calls to all models and combines the responses into one. The UI reports the result as "TOP
crops"‚ "plan3ng window"‚ "best selling window"‚ and "oversupply risk" with a brief
descrip3on.

## 6.4 Known Limita@ons

Public datasets may not generalize across regions and crops. Demand signals (Trends / Reddit)
may be noisy and may not map to local buying behavior. However‚ I will treat them as
suppor3ng evidence on key aspects.


Time is a major considera3on‚ and if I am crunched for it I will set my primary goal as the core
pipeline (soils + forecasts + ranking) and the district collec3ve will be a "should have". All
limita3ons will be clearly noted.


## 7: Ethical Approval

## Student Project Approval Form
LD6053 Student Project Approval Form
You should use this document if you intend to use one of the exis3ng
module level approval ethics applica3ons. Please complete this
document and discuss your study with your supervisor before you
collect any data. Failure to complete this document and have all aspects
signed off and approved by your supervisor risks a notable deduc8on in
your grade and may risk a case of Academic misconduct. Please see the
module Bb site for more details.

Please ensure that your project meets the condi3ons of the exis3ng ethics applica3on (available
on Module Bb site). If it does not, then you will need to submit a full ethics applicaDon instead.

## Student Name: Beruwala Liyanage Savindu Thathsara
Project Title: An Intelligent Crop Planning and Market Intelligence System
for Smallholder Farmers
## Supervisor Name: Omer Raza
Ethics applica3on you are
amending (check box):

☐   Low-risk Lab-based research
☒   Low Risk Secondary Data Science project
☐   Medium Risk Secondary Data Science project from the
private domain required membership
☐   Ques3onnaire/ survey Study
☐   Interview Study or other Usability Study

Introduc6on to the project: Treat like an introduc8on to the study. Why is your proposed study
important? What has already been done on the topic? How does your proposed study ‘fit’ with
the current literature and what does it add? What is the aim of the proposed study? Make
reference to appropriate studies.

Repeatedly‚ smallholder farmers in the developing world plant what they have always planted
- according to habit and hearsay - without any market informa3on‚ demand or price forecast
at the beginning of the season‚ resul3ng in oversupply‚ missed peaks and suppressed farm
income. Despite advances in agricultural machine learning‚ crop recommenda3on systems
focus on soil and climate suitability‚ overlooking weather forecasts and market and social
demand signals that also inform plan3ng decisions. While exis3ng literature uses LSTM-
Supervisor sign off
Ethics form
complete
## ☐
Ethical concerns
acknowledged
## ☐
Research tool(s)
checked
## ☐
All relevant forms
included (consent
etc.)
## ☐
Is not high risk
## ☐

based models to predict agricultural prices (Mohan et al.‚ 2023; Zhang et al.‚ 2025) and finds
a connec3on between Google Trends data and commodity demand changes (Politecnico di
Milano‚ 2016)‚ none have created a system that ranks crops by profit and considers all signals
for smallholder farmers. This paper builds off of this work to design‚ implement‚ and evaluate
FarmSense AI: a web applica3on machine learning (ML) plaform that combines a Random
Forest crop suitability model‚ LSTM weather model‚ LSTM price predic3on model‚ natural
language processing Google Trends and Reddit social demand signal pipeline‚ and an XGBoost
profit op3miza3on model‚ in order to see if this combina3on of signals leads to improved
profits and greater predic3ve accuracy over previous models.



Methodology: Please complete the table below, using the following info to guide you. Write this
as a future tense method. Describe the parDcipants that you will recruit, how many you are
going to recruit, and indicate if you have any addi8onal exclusion criteria. Include the research
design (e.g. randomised/repeated measures/quan8ta8ve/qualita8ve/case study etc) and detail
of your proposed procedures (i.e., how are you collec8ng the data?). Include informa8on on all
of the equipment you plan to use. If this is a low-risk study, outline how you will extract data and
list the criteria you will use to do this. Somebody should be able to read this and replicate it.
Describe all planned data analysis for both quan8ta8ve (e.g. t-tests, ANOVA, correla8on etc.)
and qualita8ve (content analysis, thema8c analysis etc.) data. If doing a low-risk study explain
how you intend to analyse the data you have collected. Use literature to jus8fy your method.

- Is this a low-risk secondary data or lab-based
study?
If Yes please go to ques3ons 6 and 7.
## ☒   YES
## ☐   NO
- Who are your par3cipants and what is the
inclusion criteria?
For the usability study‚ adult
par3cipants‚ aged 18 or older‚ with a
background in agriculture‚
compu3ng‚ or data science were
recruited as domain-expert proxies
of the end user group (i.e.‚ farmers)
## .
- How many will you recruit and from where?
Three to five people who study or
work at the university.
- Are there any exclusion criteria (reasons why
people should not par3cipate)?
Par3cipants aged less than 18 years‚
not able to provide informed

consent‚ and those not familiar with
web-based applica3ons will be
excluded. Par3cipa3on is voluntary
and par3cipants can withdraw from
the study at any 3me and for any
reason without penalty or prejudice
- Research design:
It is delivered using a Design and
Build and an Experiment approach.
The research design is quan3ta3ve
which focuses on the Training‚
Evalua3on‚ Comparison of ML
models against set performance and
baseline models. Another
qualita3ve factor is a think-aloud
usability test of the web applica3on
interface with domain experts. The
overall used development
methodology is CRISP-DM (Cross-
Industry Standard Process for Data
Mining)‚ which is well-suited since
the greatest challenges are the data
quality and the model performance
rather than the implementa3on of
func3onali3es.
- Procedures (describe what you will do to collect
data, include all equipment/methods you plan to
use).
All ML model training data will be
sourced from publicly available
datasets and APIs that do not
require any subscrip3ons or
payments‚ as for example:

## • Kaggle Crop
## Recommenda3on Dataset -
directly downloaded from
kaggle.com. No
membership is required‚ only
a free account

- DEFRA UK Agricultural Price
Indices ‚  downloaded from
the UK government's Open
## Government Licence
- UK Met Office Weather Data
downloaded from Kaggle
- Google Trends data can be
accessed using the Pytrends
Python library without an API
key.
- Data from posts and
comments was collected
using the PRAW Python
library and a free developer
account

None of these sources are 3ed to
any personal data.
- Data analysis methods:
Quan3ta3ve analysis ‚  ML model
evalua3on:
For all ML models‚ standard
quan3ta3ve metrics will be used‚
depending on the performed task.
The Random Forest model for crop
suitability will be evaluated using
accuracy‚ precision‚ recall and F1
score metrics.
Qualita3ve analysis: usability
assessment.
The usability session notes will be
analyzed for themes of usability
problems and posi3ve user
interac3ons.
- Addi3onal informa3on:
This research does not include
vulnerable popula3ons or sensi3ve
topics‚ decep3on for research
purposes‚ audio or video recordings‚

physiological measurements‚ or
online data collec3ons from
par3cipants using iden3fiable
informa3on.

Health and Safety:  Relevant risk assessments are listed in the ethics applica8on. If your project
needs addi8onal risk assessments, then you will need to submit a new ethics applica8on. Please
iden8fy the elements of the listed risk assessment that are relevant for your study and the risk
assessment(s) you are working with.

Please check the relevant boxes*:
☐   HL_RISK_173 Tes3ng in an external environment
☒   HL_RISK_722 face to face interview
☐   HL_RISK_727 Group interview

Areas of poten6al risk
Please indicate how you will eliminate, or as a minimum ameliorate, the following areas of
poten8al risks throughout the processes of research design, data genera8on, data analysis and
dissemina8on
Area of risk Ques6ons rela6ng to this risk How will you mi6gate
against this risk?
Avoiding harm to all
involved in or poten3ally
affected by the research
How will you ensure that your
par3cipants/ respondents come to no
harm (psychological; emo3onal; physical).
e.g. not subjec3ng them to ques3oning
about sensi3ve issues without advance
agreement?
Par3cipants  will  only
be  asked  to  complete
non-sensi3ve
compu3ng  tasks  on  a
web applica3on.
Sensi3ve‚    distressing
or personally
iden3fying   ques3ons
will not be ask.
How will you ensure your own safety
(beyond just physical) in undertaking the
## Enquiry?
All usability things will
take   place   within   a
home university
building during
normal working hours
## .

Ensuring the
anonymity of all
par3cipants /
respondents
How will you ensure anonymity in
collec3ng/genera3ng data
No    names‚    contact
details   or   iden3fying
informa3on    will    be
recorded    during    or
acer the usability
session  and  therefore
all notes and research
analysis  will  use  only
the defined codes (P1‚
P2‚ P3 etc).
How will you ensure anonymity in
repor3ng the data?
All    results    will    be
reported using
par3cipant  codes  and
no iden3fying
informa3on    will    be
included in the
disserta3on  or  other
documents.
Gaining informed
consent from all
par3cipants /
respondents
How will you ensure
respondent/par3cipant consent in
advance? You should provide a copy of
the necessary consent form/s with this
document
Prior  to  the  start  of
the    experiment‚    all
par3cipants    will    be
given a wriYen
par3cipant
informa3on sheet
detailing  the  research
aims   and   objec3ves
and par3cipants'
rights‚    and    will    be
asked to sign a wriYen
consent  form  prior  to
the session. A copy of
the   consent   form   is
aYached.
(How) might par3cipants/respondents be
able to withdraw their data?
During   or   acer   the
psychophysics
experiment‚
par3cipants can
withdraw    from    the

experiment     at     any
3me without
providing a
jus3fica3on   for   their
withdrawal‚  and  their
data    will    then    be
discarded.
Avoiding decep3on How will you how you promote accuracy
in recording, analysis, repor3ng of the
data/findings?
All   subjects   will   be
debriefed    acer    the
session with an
explana3on     of     the
purpose of the study.
No  decep3on  will  be
used. All     usability
issues will be reported
honestly and
accurately.
Data storage and
destruc3on
How will you transport and store your
data securely (e.g. password protected;
cloud storage)
All   notes   from   the
session   and   consent
forms will be stored in
a  password-protected
folder on the
researcher's  personal
university-assigned
computer.
How will you destroy the data and when? All   data   rela3ng   to
study par3cipants
including consent
forms‚ researcher
notes and files
rela3ng to
par3cipants'  data  will
be permanently
deleted and physically
destroyed  within  one
month of the project's
submission.

Secondary data sets Is your data set(s) from a domain requires
membership?
No. All datasets used‚
including  Kaggle  Crop
## Recommenda3on
Dataset‚    DEFRA    UK
## Agricultural Price
Indices‚ UK Met Office
Weather     Data     and
Reddit/TwiYer
Sen3ment Dataset are
publicly available.
Does this data set can be used for
educa8onal or academic research
purpose?
Ye s. All  datasets  are
confirmed  as  licensed
for academic and
educa3onal   research
use.

Please check this box acer you have read and understood ethics and health and safety
informa3on.

☒   I confirm I have read the University’s health and safety policy and ethics policy. I have read
and understood the requirement for the mandatory comple3on of risk assessments and that my
study does not deviate from the module level approval ethics forms on Blackboard.

Further informa6on (add below, if applicable)
- Consent forms
- Par3cipant informa3on sheet
- Debrief form
- Recruitment materials
- Permission leYers
- Data collec3on tools

Student’s Name and sign

(Name) : Beruwala Liyanage Savindu Thathsara
## Date : 08/05/2026

Supervisor’s name and sign  Date
## 09/05/26


(Name) : Omer Raza



8: Evidence of Project Development
- React scaffold: Landing, Dashboard, Market, Plan flows.
- Dataset shortlist drafted (prices, weather, suitability, sentiment).
- Testing evidence to attach: pytest run summary, one API test (e.g., Postman/Swagger), key UI
screens.
- Architecture and DB entities noted in repo docs.

Figure 3 : ER / data model


Figure 4 : FarmSense AI UI Landing page


Figure 5 : Market and recommenda5on details UI


Figure 6 : Project repository file structure

## References

- AJIC (2023) ‘Informa3on systems and smallholder farming: a systema3c literature
review’, African Journal of Informa3on and Communica3on, 33. Available at:
hYps://journals.co.za/doi/abs/10.23962/ajic.i33.17050 (Accessed: 22 March 2026).
- Osei-Bonsu, I. et al. (2023) ‘Informa3on systems and smallholder farming: a systema3c
literature review’, African Journal of Informa3on and Communica3on, 33.
- SAGE (2021) ‘ICT and agricultural informa3on dissemina3on to smallholder farmers in
Sub-Saharan Africa’, Informa3on Development, 38(1). Available at:
hYps://journals.sagepub.com/doi/full/10.1177/02666669211064847 (Accessed: 25
## March 2026).
- Wireko-Gyebi, R. et al. (2024) ‘Farmers’ Digital Informa3on System for sustainable
agriculture in Tanzania’, Informa3on, 15(12), p. 816. Available at:
hYps://www.mdpi.com/2078-2489/15/12/816 (Accessed: 26 March 2026).
- DEFRA (n.d.) ‘UK Agricultural Market Monitoring Group Monthly Prices’. Available at:
hYps://environment.data.gov.uk/dataset/de7fac73-26e4-4ee1-9a1c-60312bce83eb
(Accessed: 4 April 2026).
- GOV.UK (n.d.) ‘Agricultural price indices’. Available at:
hYps://www.gov.uk/government/sta3s3cs/agricultural-price-indices (Accessed: 30 April
## 2026).
- Kaggle (n.d.) ‘Crop Recommenda3on Dataset’. Available at:
hYps://www.kaggle.com/datasets/atharvaingle/crop-recommenda3on-dataset
(Accessed: 12 April 2026).
- Wright, J. (n.d.) ‘2M+ Daily Weather History UK’. Kaggle dataset. Available at:
hYps://www.kaggle.com/datasets/jakewright/2m-daily-weather-history-uk (Accessed:
## 22 April 2026).
- Nature Scien3fic Data (2025) ‘CYCleSS — Comprehensive UK Crop Yield Dataset’.
Available at: hYps://www.nature.com/ar3cles/s41597-025-06528-x (Accessed: 04 May
## 2026).

Declaration of use of generative AI (for LD6053 AI declaration checkbox):
Anthropic (2026) Claude (large language model / AI assistant). Anthropic, PBC. Available at:
https://www.anthropic.com/claude (Accessed: 15 March 2026). How used: To suggest overall document
structure, section order, and template layout for this proposal.


## Appendix

A1  - Dataset preview



Figure 7 : A1 - Dataset preview (Crop recommenda5on)



Figure 8 : A1 - Dataset preview (Weather data)
A2 - SWOT analysis



Figure 9 : A2 - SWOT analysis

A3 - Supervisor mee@ng log



Figure 10 : A3 - Supervisor mee5ng log (27/03/26)


Figure 11 : A3 - Supervisor mee5ng log (16/04/26)

A4 - Literature summary table



Figure 12 : A4 - Literature summary