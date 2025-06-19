# main.py
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests
from statsmodels.tsa.arima.model import ARIMA
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import numpy as np
import traceback
from supabase import create_client, Client
from gotrue.errors import AuthApiError # Import AuthApiError for specific error handling


# --- Supabase Initialization (for backend access) ---
# Use a SERVICE_ROLE_KEY here for secure backend operations, NOT the anon key
# Ensure these are set as environment variables
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL","https://splvfnmdkjijhfkdttuf.supabase.co") # Same URL as frontend

# IMPORTANT: Remove the hardcoded actual key from here. It should *only* come from an environment variable.
# If the environment variable isn't set, it will default to None.
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbHZmbm1ka2ppamhma2R0dHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg1NTIxOCwiZXhwIjoyMDY0NDMxMjE4fQ.Mx66dPbNquGqisRsEhww91qYbFwbzL-hAwsHbJpF28Y" # Removed the default placeholder string

# --- DEBUG PRINT: Verify the loaded environment variables ---
print(f"DEBUG: SUPABASE_URL being used: {SUPABASE_URL}")
# DO NOT PRINT THE FULL SERVICE KEY IN PRODUCTION LOGS for security.
# For debugging, you can print a small part or its length to confirm it's not empty.
print(f"DEBUG: SUPABASE_SERVICE_KEY length: {len(SUPABASE_SERVICE_KEY) if SUPABASE_SERVICE_KEY else 0}")
print(f"DEBUG: SUPABASE_SERVICE_KEY starts with: {SUPABASE_SERVICE_KEY[:8] if SUPABASE_SERVICE_KEY else 'N/A'}")


# Simplified check: now it only raises an error if the variables are truly not set.
# The problematic comparison to the old placeholder string has been removed.
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set for the backend.")


supabase_backend: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allow your Next.js frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency to get the current authenticated sales person ---
async def get_current_sales_person(authorization: str = Header(None)) -> Optional[str]:
    """
    Authenticates the user using the Supabase token. If the user has an associated
    'Sales_Person' profile, it returns that name. Otherwise, it returns None,
    which allows access to all data.
    """
    if not authorization:
        print("Backend: Authorization header missing.")
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = authorization.replace("Bearer ", "") # Extract the JWT token

    try:
        # Verify the token with Supabase Auth
        print("Backend: Attempting to get user from token...")
        user_response = supabase_backend.auth.get_user(token)
        user_id = user_response.user.id
        print(f"Backend: Authenticated user ID: {user_id}")

        # Fetch the sales_person from the 'users' table using the user_id
        # Use .limit(1) and check if data exists, instead of .single() which errors if no rows
        query = supabase_backend.from_('users').select('Sales_Person').eq('id', user_id).limit(1)
        profile_response = query.execute() # No .single() here

        # --- UPDATED LOGIC ---
        # If no profile data is found, return None. This will cause the data to be unfiltered.
        if not profile_response.data: # Check if data list is empty
            print(f"Backend: User profile not found for user ID: {user_id}. Accessing all data.")
            return None # Return None to show all data

        # If data exists, get the first item from the list and return the sales person's name for filtering.
        sales_person = profile_response.data[0].get('Sales_Person') if profile_response.data else None
        print(f"Backend: Fetched Sales_Person for filtering: {sales_person}")
        return sales_person

    except AuthApiError as e:
        # This still protects against invalid tokens.
        print(f"Backend: Supabase Auth API Error: {e.status} - {e.message}")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e.message}")
    except Exception as e:
        print(f"Backend: General error during token verification or profile fetching: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# In-memory storage for sales raw data and predictions
# In a production environment, this would typically be fetched from a database
SALES_RAW_DATA: pd.DataFrame = pd.DataFrame()
LAST_FETCH_TIME: Optional[datetime] = None
PREDICTION_MODELS: Dict[str, Any] = {} # Stores trained ARIMA models
PREDICTION_RESULTS: pd.DataFrame = pd.DataFrame() # Stores forecast results

# --- Helper function to fetch data from Supabase ---
async def fetch_data_from_supabase():
    global SALES_RAW_DATA, LAST_FETCH_TIME
    print("Attempting to fetch data from Supabase...")
    try:
        # Fetch 'sales_raw_data'
        response = supabase_backend.from_('sales_raw_data').select('*').execute()
        
        # Note: The supabase-py v2 client for sync operations doesn't return an awaitable.
        # The .execute() call is blocking. If you were in a fully async context with an async client, you would await.
        # However, FastAPI handles running sync functions in a threadpool, so this is okay.
        
        data = response.data
        if not data:
            print("No data fetched from sales_raw_data.")
            SALES_RAW_DATA = pd.DataFrame()
            return

        SALES_RAW_DATA = pd.DataFrame(data)
        
        print(f"DEBUG: Columns after initial fetch: {SALES_RAW_DATA.columns.tolist()}")

        # Convert column names to a consistent format (e.g., snake_case)
        SALES_RAW_DATA.columns = [col.lower().replace(' ', '_') for col in SALES_RAW_DATA.columns]
        print(f"DEBUG: Columns after lowercasing and snake_case conversion: {SALES_RAW_DATA.columns.tolist()}")


        # --- UPDATED: Added 'txdate' and 'journey_dt' to common date column names ---
        date_columns_to_check = ['date', 'saledate', 'transaction_date', 'order_date', 'txdate', 'journey_dt'] 
        found_date_col = None
        for col_name in date_columns_to_check:
            if col_name in SALES_RAW_DATA.columns:
                found_date_col = col_name
                break

        if found_date_col and found_date_col != 'date':
            SALES_RAW_DATA.rename(columns={found_date_col: 'date'}, inplace=True)
            print(f"DEBUG: Renamed '{found_date_col}' to 'date'. Current columns: {SALES_RAW_DATA.columns.tolist()}")
        elif not found_date_col:
            print(f"Warning: No common date column found in {SALES_RAW_DATA.columns.tolist()} (checked {date_columns_to_check}). Forecasting may fail.")


        # Convert 'date' column to datetime objects
        if 'date' in SALES_RAW_DATA.columns:
            try:
                # --- CRITICAL FIX: Use format='mixed' to handle various date formats ---
                SALES_RAW_DATA['date'] = pd.to_datetime(SALES_RAW_DATA['date'], format='mixed', errors='coerce')
                # Drop rows where date conversion failed (if any)
                SALES_RAW_DATA.dropna(subset=['date'], inplace=True)
                
                # Extract month for grouping/display
                SALES_RAW_DATA['month'] = SALES_RAW_DATA['date'].dt.strftime('%Y-%m')
                print(f"DEBUG: 'date' column successfully converted to datetime and 'month' column created.")
                print(f"DEBUG: Date column info after conversion:\n{SALES_RAW_DATA['date'].info()}")
                print(f"DEBUG: Sample dates:\n{SALES_RAW_DATA['date'].head()}")

            except Exception as e:
                print(f"Error converting 'date' column to datetime: {e}. 'date' column type: {SALES_RAW_DATA['date'].dtype}")
                # If conversion fails, drop the 'date' column to prevent further errors or handle as needed
                SALES_RAW_DATA.drop(columns=['date'], errors='ignore', inplace=True)
                print("Warning: 'date' column conversion failed and was dropped. Forecasting will likely fail.")
        else:
            print("Warning: 'date' column not found in sales_raw_data after all processing. Forecasting will likely fail.")
        
        # --- UPDATED: Handle 'category' column ---
        if 'category' in SALES_RAW_DATA.columns:
            SALES_RAW_DATA['category'] = SALES_RAW_DATA['category'].astype(str)
            print("DEBUG: 'category' column found and processed.")
        else:
            # If 'category' column is not found, create a default one
            SALES_RAW_DATA['category'] = "Total Sales"
            print("Warning: 'category' column not found in sales_raw_data. A 'Total Sales' category was created.")
            print(f"DEBUG: 'category' column assigned as 'Total Sales'.")


        # Ensure 'sales_person' column exists and is string type for filtering
        if 'sales_person' in SALES_RAW_DATA.columns:
            SALES_RAW_DATA['sales_person'] = SALES_RAW_DATA['sales_person'].astype(str).str.strip()
            print(f"DEBUG: 'sales_person' column processed. Sample:\n{SALES_RAW_DATA['sales_person'].head()}")
        else:
            print("Warning: 'sales_person' column not found in data, Sales person filtering will be skipped.")


        LAST_FETCH_TIME = datetime.now()
        print(f"Data fetched successfully at {LAST_FETCH_TIME}. Rows: {len(SALES_RAW_DATA)}. Final columns: {SALES_RAW_DATA.columns.tolist()}")

    except Exception as e:
        print(f"Failed to fetch data from Supabase: {e}")
        traceback.print_exc()


# --- Data Loading and Preprocessing Endpoint ---
@app.get("/api/load-data")
async def load_data():
    """
    Loads sales raw data from Supabase into memory.
    This endpoint can be called to refresh the in-memory data.
    """
    await fetch_data_from_supabase()
    if SALES_RAW_DATA.empty:
        raise HTTPException(status_code=500, detail="Failed to load data or no data available.")
    return {"status": "success", "message": f"Data loaded. Rows: {len(SALES_RAW_DATA)}"}


# --- ARIMA Model Training and Forecasting ---
def train_and_forecast(df_category: pd.DataFrame, months_to_forecast: int) -> pd.Series:
    # Ensure the DataFrame is sorted by date and indexed by it for ARIMA
    df_category = df_category.set_index('date').sort_index()

    # Log df_category info after setting index
    print(f"DEBUG: df_category info for ARIMA training (after setting index):\n{df_category.info()}")
    print(f"DEBUG: df_category head for ARIMA training:\n{df_category.head()}")


    # Aggregate actuals by month (or relevant frequency)
    # Ensure numerical column is used for aggregation, e.g., 'actual' or similar
    if 'actual' not in df_category.columns:
        # Assuming 'revenue' is the column that represents the actual sales value
        if 'revenue' in df_category.columns:
            df_category['actual'] = pd.to_numeric(df_category['revenue'], errors='coerce').fillna(0)
            print("DEBUG: 'actual' column created from 'revenue' for forecasting.")
        else:
            raise ValueError("Missing 'actual' or 'revenue' column for forecasting.")
    
    ts = df_category['actual'].resample('MS').sum().fillna(0) # 'MS' for Month Start frequency

    # Log time series details
    print(f"DEBUG: Time series (ts) for ARIMA for category {df_category.name if hasattr(df_category, 'name') else 'N/A'}:\n{ts.head()}")
    print(f"DEBUG: ts length: {len(ts)}, ts sum: {ts.sum()}")


    # --- MODIFIED: Explicitly check for minimum data points for ARIMA ---
    # ARIMA(1,1,1) typically needs at least 3-5 data points to reliably estimate parameters.
    if len(ts) < 3 or ts.sum() == 0: # Changed from < 2 to < 3
        print(f"Skipping ARIMA for a category due to insufficient data (less than 3 points) or all zeros: {len(ts)} points, sum={ts.sum()}")
        # Return a series of NaNs for the forecast period
        if len(ts) > 0:
            # If there's at least one point, start forecast from next month
            forecast_start_date = ts.index.max() + pd.DateOffset(months=1)
        else:
            # If no data points, start forecast from current month
            forecast_start_date = datetime.now().replace(day=1)
        forecast_dates = pd.date_range(start=forecast_start_date, periods=months_to_forecast, freq='MS')
        return pd.Series(np.nan, index=forecast_dates)

    # Determine p, d, q parameters (example: ARIMA(1,1,1))
    # In a real scenario, you'd use auto_arima or statistical tests to find optimal p,d,q
    p, d, q = 1, 1, 1 # Example parameters

    try:
        model = ARIMA(ts, order=(p, d, q))
        model_fit = model.fit()
        forecast = model_fit.predict(start=len(ts), end=len(ts) + months_to_forecast - 1)
        return forecast
    except Exception as e:
        print(f"ERROR: ARIMA training/forecasting failed for category {df_category.name if hasattr(df_category, 'name') else 'N/A'}: {e}")
        traceback.print_exc()
        # Return a series of NaNs if forecasting fails for a category
        if len(ts) > 0:
            forecast_start_date = ts.index.max() + pd.DateOffset(months=1)
        else:
            forecast_start_date = datetime.now().replace(day=1)
        forecast_dates = pd.date_range(start=forecast_start_date, periods=months_to_forecast, freq='MS')
        return pd.Series(np.nan, index=forecast_dates)


async def generate_forecast_data(
    months: int,
    sales_person_filter: Optional[str] = None,
    dimension_col: Optional[str] = None,
    dimension_filter_value: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    global SALES_RAW_DATA

    if SALES_RAW_DATA.empty:
        await fetch_data_from_supabase()
        if SALES_RAW_DATA.empty:
            return []

    df = SALES_RAW_DATA.copy()

    # Apply sales_person filter if provided by the authenticator.
    # If sales_person_filter is None, this block is skipped and all data is used.
    if sales_person_filter and 'sales_person' in df.columns:
        print(f"Filtering data for Sales Person: {sales_person_filter}")
        df = df[df['sales_person'].astype(str).str.lower() == sales_person_filter.lower()]
        if df.empty:
            print(f"DEBUG: DataFrame is empty after filtering by Sales_Person = '{sales_person_filter}'")
            return []
    elif sales_person_filter and 'sales_person' not in df.columns:
         print("Warning: 'sales_person' column not found in data, skipping sales_person filter.")

    print(f"DEBUG: len(df) after sales_person filter: {len(df)}")


    # Apply dimension filter if provided
    if dimension_col and dimension_filter_value:
        processed_dimension_col = dimension_col.strip().replace(' ', '_').lower()
        if processed_dimension_col in df.columns:
            df = df[df[processed_dimension_col].astype(str).str.lower() == dimension_filter_value.lower()]
            if df.empty:
                print(f"DEBUG: DataFrame is empty after filtering by dimension '{dimension_col}' and value '{dimension_filter_value}'")
                return []
        else:
            print(f"Warning: Dimension column '{dimension_col}' not found in data, skipping dimension filter.")
    print(f"DEBUG: len(df) after dimension filter: {len(df)}")


    # Ensure 'date' column exists after all filtering before proceeding with forecasting logic
    if 'date' not in df.columns:
        print("Error: 'date' column is missing after all filters. Cannot generate forecast.")
        return []

    # Ensure 'revenue' column exists and is numeric for calculations
    if 'revenue' not in df.columns:
        print("Warning: 'revenue' column not found. Cannot generate forecast without sales data.")
        return []
    df['revenue'] = pd.to_numeric(df['revenue'], errors='coerce').fillna(0)


    all_forecast_data = []

    # Get the current month (start of current month)
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


    print(f"DEBUG: Starting forecast generation for {len(df.groupby('category'))} categories. Current month start: {current_month_start}")
    # Group by category (e.g., 'Revenue', 'Profit', 'Expenses')
    for category_name, df_category in df.groupby('category'):
        try:
            print(f"DEBUG: Processing category: {category_name}. Data points for category: {len(df_category)}")
            print(f"DEBUG: df_category head for {category_name}:\n{df_category.head()}")

            # Generate forecast for this category
            # Pass df_category with 'revenue' as 'actual' for train_and_forecast consistency
            df_category_for_arima = df_category.assign(actual=df_category['revenue'])
            
            # --- CRITICAL CHANGE: Train ARIMA only on historical data *before* current month ---
            ts_for_training = df_category_for_arima.set_index('date').sort_index()['actual'].resample('MS').sum().fillna(0)
            ts_actual_historical = ts_for_training[ts_for_training.index < current_month_start]
            
            # If after filtering, there's not enough data for ARIMA, handle it gracefully
            forecast_series = pd.Series(np.nan) # Initialize forecast_series
            if len(ts_actual_historical) < 3 or ts_actual_historical.sum() == 0:
                print(f"Skipping ARIMA for category {category_name} due to insufficient data for training (less than 3 points before current month) or all zeros.")
                # Generate a dummy forecast series of NaNs for the requested period starting from current month
                forecast_dates = pd.date_range(start=current_month_start, periods=months, freq='MS')
                forecast_series = pd.Series(np.nan, index=forecast_dates)
            else:
                # Train ARIMA using the historical data up to the last completed month
                p, d, q = 1, 1, 1
                try:
                    model = ARIMA(ts_actual_historical, order=(p, d, q))
                    model_fit = model.fit()
                    # Forecast 'months' periods starting from the current month
                    # The start index for prediction needs to align with the current month relative to ts_actual_historical
                    forecast_series = model_fit.predict(start=len(ts_actual_historical), end=len(ts_actual_historical) + months - 1)
                    # Rename the forecast series index to be actual dates for clarity
                    forecast_series.index = pd.date_range(start=current_month_start, periods=months, freq='MS')

                except Exception as e:
                    print(f"ERROR: ARIMA training/forecasting failed for category {category_name} with filtered data: {e}")
                    traceback.print_exc()
                    forecast_dates = pd.date_range(start=current_month_start, periods=months, freq='MS')
                    forecast_series = pd.Series(np.nan, index=forecast_dates)
            
            print(f"DEBUG: Forecast series for {category_name} (starts from {forecast_series.index.min() if not forecast_series.empty else 'N/A'}): \n{forecast_series}")

            # Now, populate the combined_df for display:
            # Range to display will go from earliest historical month up to the end of the forecast.
            min_display_date = ts_for_training.index.min() if not ts_for_training.empty else current_month_start
            max_display_date = forecast_series.index.max() if not forecast_series.empty else ts_for_training.index.max()

            # Ensure the display range covers at least the requested forecast period from current month
            display_end_date_from_current = current_month_start + pd.DateOffset(months=months - 1)
            display_end_date = max(max_display_date, display_end_date_from_current)


            combined_df = pd.DataFrame(index=pd.date_range(start=min_display_date.replace(day=1),
                                                             end=display_end_date.replace(day=1),
                                                             freq='MS'))
            combined_df['category'] = category_name # Add category to the DataFrame

            # Populate display columns
            combined_df['display_actual'] = np.nan
            combined_df['display_forecast'] = np.nan
            combined_df['is_future'] = False # Default to False, will be updated below

            for monthly_date in combined_df.index:
                actual_val = ts_for_training.get(monthly_date, None) # Get actual from the full historical ts
                forecast_val = forecast_series.get(monthly_date, None) # Get forecast from the newly generated forecast_series

                is_future_for_display = monthly_date >= current_month_start # True if month is current or future

                # Populate the display values based on whether it's historical or future
                if is_future_for_display:
                    # For current month and future months: prioritize forecast
                    if pd.notna(forecast_val):
                        combined_df.loc[monthly_date, 'display_forecast'] = forecast_val
                    elif pd.notna(actual_val) and actual_val != 0.0:
                        # If no forecast for this future month (e.g., if forecast_series didn't cover it fully),
                        # but there's a non-zero actual historical value, show that as actual.
                        combined_df.loc[monthly_date, 'display_actual'] = actual_val
                    # If actual_val is 0.0 for a future month and no forecast_val, both display_actual/forecast remain NaN/None.
                else:
                    # For historical months (before current month): always show actual
                    if pd.notna(actual_val):
                        combined_df.loc[monthly_date, 'display_actual'] = actual_val
                
                combined_df.loc[monthly_date, 'is_future'] = is_future_for_display


            # Prepare the final list of dicts for the frontend
            all_forecast_data_for_category = []
            for date_idx, row in combined_df.iterrows():
                # Only include rows that have either an actual or a forecast to display
                if pd.notna(row['display_actual']) or pd.notna(row['display_forecast']):
                    all_forecast_data_for_category.append({
                        "date": date_idx.strftime('%Y-%m-%d'),
                        "month": date_idx.strftime('%Y-%m'),
                        "category": category_name,
                        "actual": round(row['display_actual'], 2) if pd.notna(row['display_actual']) else None,
                        "forecast": round(row['display_forecast'], 2) if pd.notna(row['display_forecast']) else None,
                        "is_future": bool(row['is_future']), # Convert numpy.bool_ to Python bool
                    })
            all_forecast_data.extend(all_forecast_data_for_category)

        except Exception as e:
            print(f"Error processing category {category_name}: {e}")
            traceback.print_exc()
            continue

    # Sort data by date, category, and is_future for consistent display and key generation
    all_forecast_data.sort(key=lambda x: (x['date'], x['category'], x['is_future']))
    
    return all_forecast_data

# --- API Endpoints ---
class ForecastRequest(BaseModel):
    months: int = 6

class DimensionForecastRequest(BaseModel):
    months: int
    dimension: str
    filter_value: str

@app.post("/api/forecast")
async def get_forecast(
    request: ForecastRequest,
    sales_person: Optional[str] = Depends(get_current_sales_person) # Inject sales_person from auth
):
    """
    Returns sales forecast data. Filters by sales_person if a profile exists,
    otherwise returns data for all sales persons.
    """
    try:
        forecast_output = await generate_forecast_data(request.months, sales_person_filter=sales_person)
        return {"status": "success", "data": forecast_output}
    except Exception as e:
        print(f"Error in /api/forecast endpoint: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast: {e}")

@app.post("/api/forecast-by-dimension")
async def get_forecast_by_dimension(
    request: DimensionForecastRequest,
    sales_person: Optional[str] = Depends(get_current_sales_person) # Inject sales_person from auth
):
    """
    Returns sales forecast data filtered by a dimension. Further filters by 
    sales_person if a profile exists, otherwise uses data for all sales persons.
    """
    try:
        forecast_output = await generate_forecast_data(
            request.months,
            sales_person_filter=sales_person,
            dimension_col=request.dimension,
            dimension_filter_value=request.filter_value
        )
        return {"status": "success", "data": forecast_output}
    except Exception as e:
        print(f"Error in /api/forecast-by-dimension endpoint: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast by dimension: {e}")

@app.get("/api/dimensions/unique-values")
async def get_unique_dimension_values(
    dimension: str,
    sales_person: Optional[str] = Depends(get_current_sales_person) # Inject sales_person from auth
):
    """
    Returns unique values for a dimension. Filters by sales_person if a 
    profile exists, otherwise returns unique values from all data.
    """
    try:
        if SALES_RAW_DATA.empty:
            await fetch_data_from_supabase()
            if SALES_RAW_DATA.empty:
                return {"status": "success", "data": []} # Return empty if no data

        df = SALES_RAW_DATA.copy()
        
        df.columns = df.columns.str.replace(' ', '_').str.lower()

        # Apply sales_person filter before finding unique dimensions.
        # If sales_person is None, this block is skipped.
        if sales_person and 'sales_person' in df.columns:
            df = df[df['sales_person'].astype(str).str.lower() == str(sales_person).lower()]
            if df.empty:
                return {"status": "success", "data": []}
        
        processed_dimension = dimension.strip().replace(' ', '_').lower()

        if processed_dimension not in df.columns:
            raise HTTPException(status_code=404, detail=f"Dimension '{dimension}' not found in data columns.")

        unique_values = df[processed_dimension].dropna().astype(str).str.strip().str.lower().unique().tolist()
        unique_values.sort()

        return {"status": "success", "data": unique_values}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in /api/dimensions/unique-values endpoint: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch unique dimension values.")

if __name__ == "__main__":
    import uvicorn
    import asyncio

    # Load data on startup
    asyncio.run(fetch_data_from_supabase())
    
    uvicorn.run(app, host="0.0.0.0", port=8000)