# Salary Service

This Python service calculates monthly salary, predicts future net salary, generates an English/Myanmar PDF using Rabbit Converter plus embedded Zawgyi-One, and trains a scikit-learn revenue model from verified monthly premium payments for the Admin Dashboard. Source/API data stays Unicode and is converted only when rendering a PDF.

Revenue prediction endpoint: `POST /api/prediction/revenue`. Send 3-60 monthly records as `points` and request 1-12 future months with `months_to_predict`.

## Start

```bash
python3 -m pip install -r requirements.txt
./run.sh
```

Environment variables are documented in `.env.example`. The service does not automatically load `.env`; export the variables in your process manager or shell.

## Prediction behavior

- Revenue data is validated, duplicate months are aggregated, records are sorted, and missing months are filled with zero.
- IQR outliers are reported for review but are not removed or changed.
- Candidate models use a time trend and, when enough history exists, seasonal month features, previous-month revenue, and a three-month rolling average.
- The last 25% of the time series (maximum six months) is held out chronologically for evaluation. Data is never randomly shuffled, and the candidate with the lowest holdout MAE is selected to reduce overfitting.
- Evaluation returns MAE, RMSE, R-squared, MAPE, holdout predictions, and a previous-month baseline comparison.
- The final model is retrained on all processed records and returns 1-12 future predictions with approximate uncertainty bounds.
- Predictions are aggregate planning estimates only. They are not used for individual policy or claim decisions.

The Admin Dashboard loads the project records from Spring Boot, sends them to this service, and displays preprocessing counts, evaluation metrics, features, actual revenue, and future predictions.

## Tests

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -v
```


## Prediction Center

The service also exposes `POST /api/prediction/operations` for aggregate application, claim, and payment-volume forecasting. See `../PREDICTION_CENTER_GUIDE.md`.
