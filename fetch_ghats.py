import requests
import json
import time

ghats = [
    "Pushkar Ghat", "Kotilingala Ghat", "Saraswati Ghat", "Gowthami Ghat", "ISKCON Ghat", 
    "TTD Ghat", "Chintalamma Ghat", "Markandeya Ghat", "Kotipalli Ghat", "Mukteswaram Ghat", 
    "Yanam Ferry Ghat", "Pattiseema Ghat", "Kovvur Ghat", "Dowleswaram Barrage Ghat", 
    "Antarvedi Ghat", "Narsapur Ghat", "Bhadrachalam Ghat", "Kaleshwaram Ghat", "Basara Ghat", 
    "Dharmapuri Ghat", "Ramagundam Ghat", "Manthani Ghat", "Eturunagaram Ghat", 
    "Kaleshwaram Sangam Ghat", "Sriram Sagar Ghat", "Nagarjuna Sagar Ghat", "Vijayawada Durga Ghat", 
    "Krishna Pushkar Ghat", "Bhavani Ghat", "Punnami Ghat", "Ibrahimpatnam Ghat", "Amaravati Ghat", 
    "Sitanagaram Ghat", "Hamsaladeevi Ghat", "Srisailam Ghat", "Sangameswaram Ghat", 
    "Mahanandi Temple Tank", "Penna River Ghat", "Gandikota Ghat", "Somasila Ghat", 
    "Nagavali Ghat", "Vamsadhara Ghat"
]

results = []

def search_osm(query):
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "GodavariPushkaraluMapBuilder/1.0"
    }
    try:
        resp = requests.get(url, params=params, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"Error searching {query}: {e}")
    return None, None

for ghat in ghats:
    # Try with Andhra Pradesh / Telangana context to improve results
    lat, lon = search_osm(ghat + ", Andhra Pradesh")
    if not lat:
        lat, lon = search_osm(ghat + ", Telangana")
    if not lat:
        lat, lon = search_osm(ghat + ", India")
    if not lat:
        lat, lon = search_osm(ghat)
        
    print(f"{ghat}: {lat}, {lon}")
    results.append({"name": ghat, "lat": lat, "lon": lon})
    time.sleep(1) # Nominatim rate limit

with open("ghats_coords.json", "w") as f:
    json.dump(results, f, indent=2)
