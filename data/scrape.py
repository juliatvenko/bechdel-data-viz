import requests
from bs4 import BeautifulSoup
import pandas as pd
import re

res = requests.get(
    "https://bechdeltest.com/?list=all",
    headers={"User-Agent": "Mozilla/5.0"}
)
soup = BeautifulSoup(res.text, "html.parser")

movies = []
current_year = None

for el in soup.find_all(["h3", "div"]):
    if el.name == "h3":
        a = el.find("a", id=re.compile(r"year-\d+"))
        if a:
            current_year = int(re.search(r"\d{4}", a["id"]).group())

    elif el.name == "div" and "movie" in el.get("class", []):
        if current_year is None:
            continue

        img = el.find("img", alt=re.compile(r"\[\[\d\]\]"))
        rating = int(re.search(r"\d", img["alt"]).group()) if img else None

        imdb_a = el.find("a", href=re.compile(r"imdb\.com"))
        imdb_url = imdb_a["href"] if imdb_a else None

        imdb_match = re.search(r"tt\d+", imdb_url) if imdb_url else None
        imdb_id = imdb_match.group() if imdb_match else None

        title_a = el.find("a", id=re.compile(r"movie-\d+"))
        if not title_a:
            continue

        movies.append({
            "year":     current_year,
            "title":    title_a.text.strip(),
            "rating":   rating,
            "imdb_id":  imdb_id,
            "imdb_url": imdb_url
        })

df = pd.DataFrame(movies)
print(f"Scraped: {len(df)} movies")
print(df.head())

df.to_csv("data/bechdel_raw.csv", index=False)
print("Saved to bechdel_raw.csv")
