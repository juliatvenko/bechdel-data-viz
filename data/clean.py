import pandas as pd

df = pd.read_csv("data/bechdel_raw.csv")
print(f"Loaded: {len(df)} movies")

duplicates = df[df.duplicated(subset="imdb_id", keep=False)]
print(f"Duplicate imdb_id entries: {len(duplicates)}")

# Conflict notes:
#   Terms of Endearment   (tt0086425): rating 1 → 3, updated officially by site admin
#   Cannibal! The Musical (tt0115819): rating 0 → 3, confirmed via comments
#   Rest: exact duplicates or alternate titles for the same film
# Strategy: keep the highest rating (most up-to-date) and longest title (most descriptive)
df_clean = (
    df.assign(title_len=df["title"].str.len())
      .sort_values(["rating", "title_len"], ascending=[False, False])
      .drop_duplicates(subset="imdb_id", keep="first")
      .drop(columns="title_len")
      .sort_values("year")
      .reset_index(drop=True)
)

print(f"Before deduplication: {len(df)}  \nAfter deduplication: {len(df_clean)}")

df_clean.to_csv("data/Bechdel.csv", index=False)
print("Saved to Bechdel.csv")
