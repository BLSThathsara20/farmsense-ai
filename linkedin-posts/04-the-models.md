# Post 04 — The models

**Series:** FarmSense AI  
**Theme:** Why Random Forest + LSTM (and demand signals)  
**Tone:** Professional, human, B1 English — light tech, not a paper  
**When to post:** After Post 03

---

## Recommended titles (pick 1)

1. Why Random Forest for soil — and LSTM for time
2. Soil is not enough: how FarmSense ranks crops
3. Random Forest, LSTM, and market signals — in plain English
4. Why I did not use one model for everything
5. From soil suitability to price outlook (Post 4)
6. A good notebook model is not a useful farm answer
7. Multi-layer crop ranking: soil, weather, price, demand
8. Why tabular soil data fits Random Forest so well
9. Beating a simple baseline mattered for price forecasts
10. Decision support, not a promise of profit

**Suggested pick:** `1` or `2`.

---

## LinkedIn post (copy this)

Here is the part people love to ask about:

**Why Random Forest?**

Soil data is mostly numbers in a table:

N, P, K, pH, and climate features.

For that kind of data, Random Forest works well.

It is strong, practical, and easy to run on a normal computer.  
In my project evaluation, the soil suitability model reached high test accuracy (around 97% on the held-out set), above my target.

But soil is only layer one.

**Weather and prices change over time.**  
So I used LSTM models for short-horizon forecasting, and compared price results against an ARIMA baseline.

Then I add another layer many soil apps ignore:

- public demand interest signals (used carefully)  
- local oversupply awareness from confirmed planting plans  

The final ranking mixes these layers (soil weighs most, then price, weather, and demand).

Important: this is decision support.  
Not a promise of profit.  
Not a replacement for local knowledge.

If you work with ML in real products, you already know this:

**A good model in a notebook is not the same as a useful answer in a user’s hands.**

Next post: what I learned the hard way while building FarmSense AI.

---

Savindu Thathsara  
BSc Computing · Northumbria University  
Building FarmSense AI

#MachineLearning #RandomForest #LSTM #Agritech #StudentProject

---

## ChatGPT image prompt (optional)

```
Dark LinkedIn graphic, lime-green accents, white text.
Headline: “Soil is not enough.”
Support line: “RF suitability · LSTM forecasts · market signals”
Bottom label: “FarmSense AI · Models · 04”
Simple three-layer stack diagram (Soil / Weather+Price / Demand), minimal line style. No equations, no dense charts. Square 1080×1080.
```

---

## Notes for you (do not post this)

- If someone asks exact metrics, you can say: RF ~97.5% accuracy on test set; LSTM price MAPE beat ARIMA in your artefacts — keep it humble (“on my evaluation set”).
- Do not claim Reddit demand if the live product uses Trends/Wikipedia honestly.
