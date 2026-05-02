export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ safe: false, reason: "Method not allowed" });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ safe: false, reason: "Image is required" });
    }

    if (!process.env.SIGHTENGINE_USER || !process.env.SIGHTENGINE_SECRET) {
      return res.status(500).json({
        safe: false,
        reason: "Sightengine keys missing",
      });
    }

    const base64Data = imageBase64.split(",")[1];
    const mimeType =
      imageBase64.match(/data:(.*);base64/)?.[1] || "image/jpeg";

    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: mimeType });

    const formData = new FormData();
    formData.append("media", blob, "product-image.jpg");
    formData.append("models", "nudity,wad,violence");
    formData.append("api_user", process.env.SIGHTENGINE_USER);
    formData.append("api_secret", process.env.SIGHTENGINE_SECRET);

    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.status === "failure") {
      return res.status(400).json({
        safe: false,
        reason: result.error?.message || "Moderation error",
      });
    }

    const getScore = (val) => {
      if (typeof val === "number") return val;
      if (val && typeof val.prob === "number") return val.prob;
      if (val && typeof val.raw === "number") return val.raw;
      return 0;
    };

    const nudity = Math.max(
      getScore(result.nudity?.sexual_activity),
      getScore(result.nudity?.sexual_display),
      getScore(result.nudity?.erotica),
      getScore(result.nudity)
    );

    const weapons = Math.max(
      getScore(result.weapon),
      getScore(result.weapons)
    );

    const drugs = Math.max(
      getScore(result.drugs),
      getScore(result.recreational_drugs),
      getScore(result.medical_drugs)
    );

    const alcohol = getScore(result.alcohol);
    const violence = getScore(result.violence);

    if (
      nudity > 0.1 ||
      weapons > 0.1 ||
      drugs > 0.1 ||
      alcohol > 0.1 ||
      violence > 0.1
    ) {
      return res.status(200).json({
        safe: false,
        reason: "Illegal image detected",
      });
    }

    return res.status(200).json({ safe: true });
  } catch (error) {
    console.error("Moderation API Error:", error);
    return res.status(500).json({
      safe: false,
      reason: "Moderation service unreachable",
    });
  }
}