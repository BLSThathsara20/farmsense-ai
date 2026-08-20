# Post 03 — Building it

**Series:** FarmSense AI  
**Theme:** How the system is built (tech, still human)  
**Tone:** Professional, human, B1 English  
**When to post:** After Post 02

---

## Recommended titles (pick 1)

1. Not just a model — a full FarmSense system
2. React + FastAPI + PostgreSQL + Docker for real farm planning
3. How I turned crop ML into something a farmer can click
4. Building FarmSense AI end to end (Post 3)
5. A mobile-first app, an API, a database — then the models
6. Why I chose Python for both API and machine learning
7. From soil input to ranked crop plan: the product flow
8. Honest software: if the signal is down, say so
9. Student build log: shipping a usable agritech stack
10. The hard part was not only ML — it was the whole product

**Suggested pick:** `1` or `4`.

---

## LinkedIn post (copy this)

People ask me: “Is FarmSense AI just a model?”

No.

A model alone does not help a farmer at 6am.

So I built a full system.

**Frontend**  
React + Vite  
A mobile-first web app — login, soil input, plans, dashboard.

**Backend**  
FastAPI (Python)  
Because my machine learning stack is Python, and I wanted one language for API + models.

**Database**  
PostgreSQL  
Users, farms, soil readings, recommendation plans, and district planting counts.

**Delivery**  
Docker Compose  
So the demo runs the same way on my machine and on another computer.

The farmer flow is simple on purpose:

1. Enter soil values (N, P, K, pH) and location  
2. Get ranked crop plans with reasons  
3. Save plans, set a planted date, see harvest / sell windows  
4. Confirm a crop so the system can watch local oversupply risk  

I care a lot about honesty in the product.

If a demand signal is down, the app should say so.  
It should not invent a nice number just to look smart.

Next post: why I used Random Forest for soil, and LSTM for weather/price.

Student builders — what was harder for you: the model, or making the whole product usable?

---

Savindu Thathsara  
BSc Computing · Northumbria University  
Building FarmSense AI

#FastAPI #React #PostgreSQL #Docker #Agritech #StudentProject

---

## ChatGPT image prompt (optional)

```
LinkedIn graphic, dark charcoal background, lime green accents.
Headline: “Not just a model.”
Support: “App · API · Database · ML”
Bottom label: “FarmSense AI · Build · 03”
Four small minimal blocks in a row labeled App / API / DB / ML. Clean, premium, lots of space. Square 1080×1080. No clutter, no stock photos.
```
