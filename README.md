# GitHub Stats Create

Create and customize a GitHub profile stats card, then copy the Markdown and paste it into your profile `README.md`.

## Create Your Card

Use the live generator:

**https://stats.shoaaib.site**

Steps for users:

1. Open the generator link.
2. Enter your GitHub username.
3. Choose theme and stats to show.
4. Click `Generate Card`.
5. Click `Copy Code`.
6. Paste into your GitHub profile `README.md`.

## Example Output

```md
![yourname GitHub Stats](https://stats.shoaaib.site/api/card?username=yourname&theme=clean&show=repos,stars,forks,followers,following,lines)
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Deploy directly.

This project is now compatible with Vercel auto-detection and does not require `vercel.json`.

## Notes

- "Estimated Lines" is an approximation from public repository language + size metadata.
- Contributions may show `--` when contribution data is not available.
