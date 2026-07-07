# Flipkart 20K E-commerce Product Dataset

## File
- `flipkart_20k.csv` — 20,000 product rows + header, 15 columns, 38,114,963 bytes

## Columns
`uniq_id, crawl_timestamp, product_url, product_name, product_category_tree, pid, retail_price, discounted_price, image, is_FK_Advantage_product, description, product_rating, overall_rating, brand, product_specifications`

## Source
- Downloaded from HuggingFace mirror:
  https://huggingface.co/datasets/jason1966/PromptCloudHQ_flipkart-products/resolve/main/flipkart_com-ecommerce_sample.csv
  (dataset page: https://huggingface.co/datasets/jason1966/PromptCloudHQ_flipkart-products)
- This is a byte-identical mirror (same 38.11 MB size and filename) of the original
  Kaggle dataset "Flipkart Products" by PromptCloudHQ:
  https://www.kaggle.com/datasets/PromptCloudHQ/flipkart-products
- Original data: pre-crawled sample of 20,000 Flipkart.com product listings, crawled
  December 2015 – June 2016 by PromptCloud.

## License
- The original Kaggle dataset is published by PromptCloudHQ under **CC BY-SA 4.0**
  (Creative Commons Attribution-ShareAlike 4.0). Attribution to PromptCloud is required;
  derivatives of the dataset itself must be shared under the same license.
- Intended use here: training/evaluation data for VargBot product-category classification
  (research/PoC use).

## Retrieval
- Retrieved: 2026-07-07
- Method: `curl -sL <resolve URL>` (no authentication required)
- Verified: 20,000 data rows, `product_category_tree` column present
