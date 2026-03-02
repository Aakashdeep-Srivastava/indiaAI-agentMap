"""Initialize Neon DB: create tables from SQLAlchemy models and seed data."""

import sys
from pathlib import Path

# Ensure the api directory is in the path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import Base, engine, SessionLocal, DATABASE_URL

SEED_SQL = """
-- ONDC Domains
INSERT INTO ondc_domains (code, name, description) VALUES
    ('RET10', 'Grocery', 'Food and grocery items including staples, spices, and daily essentials'),
    ('RET12', 'Fashion', 'Clothing, garments, textiles, and fashion accessories'),
    ('RET14', 'Electronics', 'Consumer electronics, mobile phones, and electrical appliances'),
    ('RET16', 'Home & Kitchen', 'Furniture, kitchenware, home décor, and handicrafts'),
    ('RET18', 'Health & Wellness', 'Ayurvedic products, herbal remedies, health supplements, and wellness items')
ON CONFLICT DO NOTHING;

-- ONDC Categories
INSERT INTO ondc_categories (domain_id, code, name) VALUES
    (1, 'RET10-001', 'Staples & Grains'),
    (1, 'RET10-002', 'Spices & Condiments'),
    (1, 'RET10-003', 'Cooking Oil & Ghee'),
    (1, 'RET10-004', 'Beverages & Tea'),
    (2, 'RET12-001', 'Sarees & Traditional Wear'),
    (2, 'RET12-002', 'Menswear'),
    (2, 'RET12-003', 'Fabrics & Textiles'),
    (3, 'RET14-001', 'Mobile Phones & Accessories'),
    (3, 'RET14-002', 'Lighting & Electrical'),
    (3, 'RET14-003', 'Computer Peripherals'),
    (4, 'RET16-001', 'Kitchen Utensils'),
    (4, 'RET16-002', 'Furniture'),
    (4, 'RET16-003', 'Handicrafts & Décor'),
    (5, 'RET18-001', 'Ayurvedic Medicines'),
    (5, 'RET18-002', 'Organic & Natural Products'),
    (5, 'RET18-003', 'Yoga & Wellness Accessories')
ON CONFLICT DO NOTHING;

-- SNPs (50)
INSERT INTO snps (name, subscriber_id, domain_codes, geo_coverage, commission_pct, min_order_value, languages_supported, rating, onboarding_support) VALUES
    ('GroceryMart India', 'snp-grocery-001', 'RET10', 'Pan-India', 4.5, 500, 'en,hi', 4.2, 'full'),
    ('KiranaConnect', 'snp-grocery-002', 'RET10', 'Maharashtra,Gujarat,Rajasthan', 3.0, 200, 'en,hi,mr,gu', 4.5, 'full'),
    ('DailyBasket', 'snp-grocery-003', 'RET10', 'Delhi,Haryana,Punjab,UP', 5.0, 300, 'en,hi,pa', 3.8, 'partial'),
    ('SpiceTrade Network', 'snp-grocery-004', 'RET10', 'Kerala,Tamil Nadu,Karnataka', 3.5, 1000, 'en,hi,ta,kn,ml', 4.0, 'full'),
    ('GrainHub', 'snp-grocery-005', 'RET10', 'MP,Chhattisgarh,Jharkhand', 4.0, 500, 'en,hi', 3.5, 'partial'),
    ('FreshDirect India', 'snp-grocery-006', 'RET10', 'Pan-India', 6.0, 200, 'en,hi', 4.3, 'full'),
    ('Sahaj Grocery', 'snp-grocery-007', 'RET10', 'Bihar,Jharkhand,West Bengal', 2.5, 150, 'en,hi,bn', 3.2, 'partial'),
    ('NaturalStore', 'snp-grocery-008', 'RET10,RET18', 'Maharashtra,Goa,Karnataka', 5.5, 800, 'en,hi,mr,kn', 4.1, 'full'),
    ('VillageProvisions', 'snp-grocery-009', 'RET10', 'Rajasthan,Gujarat', 2.0, 100, 'en,hi,gu', 3.0, 'none'),
    ('MegaMart Digital', 'snp-grocery-010', 'RET10', 'Pan-India', 7.0, 1000, 'en,hi', 4.6, 'full'),
    ('TextileHub India', 'snp-fashion-001', 'RET12', 'Pan-India', 5.0, 1000, 'en,hi', 4.3, 'full'),
    ('SareeBazaar', 'snp-fashion-002', 'RET12', 'UP,Bihar,West Bengal', 3.5, 500, 'en,hi,bn', 4.1, 'full'),
    ('FabIndia Connect', 'snp-fashion-003', 'RET12', 'Pan-India', 8.0, 2000, 'en,hi', 4.7, 'full'),
    ('Handloom Direct', 'snp-fashion-004', 'RET12', 'Telangana,AP,Tamil Nadu', 2.5, 300, 'en,hi,te,ta', 3.9, 'partial'),
    ('KurtaKraft', 'snp-fashion-005', 'RET12', 'Rajasthan,Gujarat,MP', 4.0, 500, 'en,hi,gu', 3.7, 'partial'),
    ('SilkRoute Marketplace', 'snp-fashion-006', 'RET12', 'Karnataka,Kerala,Tamil Nadu', 6.0, 1500, 'en,hi,kn,ta,ml', 4.4, 'full'),
    ('EthnicWear Hub', 'snp-fashion-007', 'RET12', 'Pan-India', 5.5, 800, 'en,hi', 4.0, 'partial'),
    ('WeaveConnect', 'snp-fashion-008', 'RET12', 'Odisha,West Bengal,Assam', 3.0, 400, 'en,hi,or,bn', 3.6, 'partial'),
    ('FashionForward', 'snp-fashion-009', 'RET12', 'Maharashtra,Delhi,Karnataka', 7.5, 2000, 'en,hi', 4.5, 'full'),
    ('DesiDrapes', 'snp-fashion-010', 'RET12', 'UP,Rajasthan', 2.0, 200, 'en,hi', 3.3, 'none'),
    ('TechBazaar', 'snp-elec-001', 'RET14', 'Pan-India', 4.0, 1000, 'en,hi', 4.1, 'full'),
    ('MobileMarket India', 'snp-elec-002', 'RET14', 'Delhi,UP,Haryana', 3.0, 500, 'en,hi', 3.8, 'partial'),
    ('ElectroHub', 'snp-elec-003', 'RET14', 'Pan-India', 5.5, 2000, 'en,hi', 4.4, 'full'),
    ('LightingWorld', 'snp-elec-004', 'RET14', 'Gujarat,Maharashtra,MP', 4.5, 800, 'en,hi,gu,mr', 3.7, 'partial'),
    ('GadgetGuru', 'snp-elec-005', 'RET14', 'Karnataka,Tamil Nadu,Kerala', 6.0, 1500, 'en,hi,kn,ta', 4.2, 'full'),
    ('RepairNet India', 'snp-elec-006', 'RET14', 'Pan-India', 3.5, 300, 'en,hi', 3.5, 'partial'),
    ('PowerTech', 'snp-elec-007', 'RET14', 'AP,Telangana', 2.5, 400, 'en,hi,te', 3.9, 'partial'),
    ('DigitalDukaan', 'snp-elec-008', 'RET14', 'Pan-India', 7.0, 3000, 'en,hi', 4.6, 'full'),
    ('CircuitStore', 'snp-elec-009', 'RET14', 'West Bengal,Odisha', 3.0, 600, 'en,hi,bn,or', 3.4, 'none'),
    ('SmartConnect', 'snp-elec-010', 'RET14', 'Punjab,Haryana,Delhi', 4.0, 700, 'en,hi,pa', 4.0, 'partial'),
    ('CraftBazaar', 'snp-home-001', 'RET16', 'Pan-India', 4.0, 500, 'en,hi', 4.3, 'full'),
    ('UtensiltMart', 'snp-home-002', 'RET16', 'Maharashtra,Gujarat', 3.0, 300, 'en,hi,mr,gu', 3.9, 'partial'),
    ('WoodWorkIndia', 'snp-home-003', 'RET16', 'Rajasthan,MP,UP', 5.0, 1000, 'en,hi', 4.1, 'full'),
    ('PotteryPalace', 'snp-home-004', 'RET16', 'West Bengal,Odisha,Jharkhand', 2.5, 200, 'en,hi,bn,or', 3.5, 'none'),
    ('HomeDecor Hub', 'snp-home-005', 'RET16', 'Pan-India', 6.0, 1500, 'en,hi', 4.5, 'full'),
    ('BambooBasket', 'snp-home-006', 'RET16', 'Assam,Tripura,Meghalaya', 2.0, 150, 'en,hi,as', 3.2, 'partial'),
    ('SteelKraft India', 'snp-home-007', 'RET16', 'Tamil Nadu,Karnataka', 3.5, 500, 'en,hi,ta,kn', 4.0, 'partial'),
    ('KitchenConnect', 'snp-home-008', 'RET16', 'Pan-India', 5.5, 800, 'en,hi', 4.2, 'full'),
    ('MatWeavers', 'snp-home-009', 'RET16', 'Kerala,Tamil Nadu', 2.0, 100, 'en,hi,ta,ml', 3.4, 'none'),
    ('ArtisanMarket', 'snp-home-010', 'RET16', 'Pan-India', 4.5, 600, 'en,hi', 4.4, 'full'),
    ('AyurvedaHub', 'snp-health-001', 'RET18', 'Pan-India', 5.0, 500, 'en,hi', 4.5, 'full'),
    ('HerbalIndia', 'snp-health-002', 'RET18', 'Kerala,Karnataka,Tamil Nadu', 3.5, 300, 'en,hi,ta,kn,ml', 4.2, 'full'),
    ('OrganicBazaar', 'snp-health-003', 'RET18,RET10', 'Pan-India', 6.0, 800, 'en,hi', 4.0, 'partial'),
    ('YogaMart', 'snp-health-004', 'RET18', 'Uttarakhand,HP,Delhi', 4.0, 500, 'en,hi', 3.8, 'partial'),
    ('NatureCure Store', 'snp-health-005', 'RET18', 'Maharashtra,Goa', 3.0, 200, 'en,hi,mr', 4.3, 'full'),
    ('WellnessConnect', 'snp-health-006', 'RET18', 'Pan-India', 7.0, 1000, 'en,hi', 4.6, 'full'),
    ('Vaidya Network', 'snp-health-007', 'RET18', 'UP,Bihar,Jharkhand', 2.5, 150, 'en,hi', 3.5, 'none'),
    ('HoneyHarvest', 'snp-health-008', 'RET18', 'Rajasthan,Gujarat,MP', 3.0, 300, 'en,hi,gu', 3.9, 'partial'),
    ('PharmaLocal', 'snp-health-009', 'RET18', 'AP,Telangana', 5.5, 600, 'en,hi,te', 4.1, 'partial'),
    ('SupplementStore', 'snp-health-010', 'RET18', 'Pan-India', 8.0, 1500, 'en,hi', 4.4, 'full')
ON CONFLICT DO NOTHING;

-- MSEs (20)
INSERT INTO mses (udyam_number, name, description, district, state, pin_code, nic_code, language, turnover_band, mobile_number, products) VALUES
    ('UDYAM-MH-01-0000001', 'Shree Ganesh Kirana Store', 'Wholesale and retail of grocery items including rice, dal, atta, spices, cooking oil, sugar, and daily provision essentials for local customers', 'Pune', 'Maharashtra', '411001', '4711', 'hi', 'micro', '9876543210', 'Rice, Dal, Atta, Spices, Cooking Oil'),
    ('UDYAM-UP-02-0000002', 'Varanasi Handloom Sarees', 'Traditional Banarasi silk saree weaving and handloom cotton textile manufacturing for domestic and export markets', 'Varanasi', 'Uttar Pradesh', '221001', '1312', 'hi', 'small', '9123456780', 'Banarasi Silk Sarees, Cotton Textiles, Dupattas'),
    ('UDYAM-KA-03-0000003', 'Bangalore Mobile Repair Hub', 'Mobile phone repair, laptop servicing, and sales of electronic accessories including chargers, cables and screen protectors', 'Bangalore Urban', 'Karnataka', '560001', '9511', 'en', 'micro', '8765432109', 'Mobile Repair, Laptop Servicing, Chargers, Screen Protectors'),
    ('UDYAM-RJ-04-0000004', 'Jaipur Blue Pottery Works', 'Handcrafted blue pottery, ceramic home décor items, and traditional Rajasthani handicraft products', 'Jaipur', 'Rajasthan', '302001', '2393', 'hi', 'micro', '7654321098', 'Blue Pottery, Ceramic Decor, Handicrafts'),
    ('UDYAM-KL-05-0000005', 'Kerala Ayurveda Naturals', 'Manufacturing of ayurvedic herbal medicines, organic wellness products, and traditional health supplements', 'Ernakulam', 'Kerala', '682001', '2100', 'ml', 'small', '9988776655', 'Ayurvedic Medicines, Organic Products, Health Supplements'),
    ('UDYAM-GJ-06-0000006', 'Surat Textile Traders', 'Wholesale distribution of polyester fabric, dress materials, and ready-made garments for retail chains', 'Surat', 'Gujarat', '395001', '1410', 'gu', 'medium', '8877665544', 'Polyester Fabric, Dress Materials, Ready-made Garments'),
    ('UDYAM-TN-07-0000007', 'Chennai Electronics Plaza', 'Retail and wholesale of LED lighting, fans, electrical switches, and home appliances', 'Chennai', 'Tamil Nadu', '600001', '2740', 'ta', 'small', '7766554433', 'LED Lighting, Fans, Electrical Switches, Home Appliances'),
    ('UDYAM-WB-08-0000008', 'Kolkata Steel Utensils', 'Manufacturing and wholesale of stainless steel kitchen utensils, cookware, and household vessels', 'Kolkata', 'West Bengal', '700001', '2599', 'bn', 'small', '9665544332', 'Steel Utensils, Cookware, Household Vessels'),
    ('UDYAM-MP-09-0000009', 'Indore Organic Store', 'Retail of organic food products, honey, herbal tea, and natural health supplements', 'Indore', 'Madhya Pradesh', '452001', '4729', 'hi', 'micro', '8554433221', 'Organic Food, Honey, Herbal Tea, Supplements'),
    ('UDYAM-MH-10-0000010', 'Nashik Grape Grocery', 'Wholesale grape distribution, dry fruit trading, and grocery provision supply to hotels and restaurants', 'Nashik', 'Maharashtra', '422001', '4630', 'mr', 'small', '9443322110', 'Grapes, Dry Fruits, Grocery Provisions'),
    ('UDYAM-AP-11-0000011', 'Tirupati Cotton Weavers', 'Handloom cotton fabric weaving and garment stitching for local and online retail', 'Tirupati', 'Andhra Pradesh', '517501', '1312', 'te', 'micro', '6332211009', 'Cotton Fabric, Handloom Garments'),
    ('UDYAM-DL-12-0000012', 'Delhi Computer Solutions', 'Computer repair, assembly, networking solutions, and IT peripheral sales', 'New Delhi', 'Delhi', '110001', '9511', 'hi', 'micro', '9221100998', 'Computer Repair, Assembly, Networking, Peripherals'),
    ('UDYAM-AS-13-0000013', 'Assam Bamboo Crafts', 'Traditional bamboo basket weaving, home décor, and eco-friendly bamboo products', 'Guwahati', 'Assam', '781001', '1629', 'as', 'micro', '8110099887', 'Bamboo Baskets, Home Decor, Eco-friendly Products'),
    ('UDYAM-UK-14-0000014', 'Rishikesh Yoga Wellness', 'Yoga accessories, meditation equipment, and ayurvedic wellness product retail', 'Dehradun', 'Uttarakhand', '248001', '3240', 'hi', 'micro', '7009988776', 'Yoga Accessories, Meditation Equipment, Ayurvedic Products'),
    ('UDYAM-BR-15-0000015', 'Patna Spice Emporium', 'Wholesale trading of spices, masala powders, turmeric, and condiments sourced from local farmers', 'Patna', 'Bihar', '800001', '1079', 'hi', 'small', '9898877665', 'Spices, Masala Powders, Turmeric, Condiments'),
    ('UDYAM-OD-16-0000016', 'Odisha Terracotta Art', 'Traditional terracotta pottery, clay sculptures, and decorative art pieces from Odisha', 'Puri', 'Odisha', '752001', '2393', 'or', 'micro', '8787766554', 'Terracotta Pottery, Clay Sculptures, Art Pieces'),
    ('UDYAM-PB-17-0000017', 'Ludhiana Hosiery Works', 'Knitted garments, woolen hosiery, and winter wear manufacturing for wholesale distribution', 'Ludhiana', 'Punjab', '141001', '1430', 'pa', 'medium', '7676655443', 'Knitted Garments, Woolen Hosiery, Winter Wear'),
    ('UDYAM-TG-18-0000018', 'Hyderabad Pearl Jewels', 'Traditional pearl jewellery, fashion accessories, and decorative items retail', 'Hyderabad', 'Telangana', '500001', '3212', 'te', 'micro', '9565544332', 'Pearl Jewellery, Fashion Accessories, Decorative Items'),
    ('UDYAM-HR-19-0000019', 'Gurgaon Smart Appliances', 'Smart home devices, IoT sensors, LED panels, and energy-efficient electrical appliances', 'Gurgaon', 'Haryana', '122001', '2750', 'hi', 'small', '8454433221', 'Smart Home Devices, IoT Sensors, LED Panels'),
    ('UDYAM-KA-20-0000020', 'Mysore Sandalwood Products', 'Natural sandalwood oil, incense sticks, and herbal beauty products manufacturing', 'Mysore', 'Karnataka', '570001', '2029', 'kn', 'micro', '7343322110', 'Sandalwood Oil, Incense Sticks, Herbal Beauty Products')
ON CONFLICT DO NOTHING;
"""


def main():
    print("Connecting to Neon DB...")
    print(f"URL: {DATABASE_URL[:50]}...")

    # Drop all tables first for a clean slate
    print("\n1. Creating tables from SQLAlchemy models...")
    Base.metadata.create_all(engine)
    print("   Tables created successfully!")

    # Seed data
    print("\n2. Inserting seed data...")
    from sqlalchemy import text

    with engine.connect() as conn:
        conn.execute(text(SEED_SQL))
        conn.commit()
    print("   Seed data inserted!")

    # Verify
    print("\n3. Verifying...")
    with engine.connect() as conn:
        from sqlalchemy import text

        for table in ["ondc_domains", "ondc_categories", "snps", "mses"]:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"   {table}: {count} rows")

    print("\nNeon DB initialized successfully!")


if __name__ == "__main__":
    main()
