INSERT INTO Stores (
    store_code,
    store_name,
    sales_tax
)
VALUES
    ('BRADLEY-FAIR', 'Bradley Fair', 7.50),
    ('NEW-MARKET', 'New Market Square', 7.50),
    ('DOWNTOWN', 'Downtown', 7.50),
    ('LAS-VEGAS', 'Fontainebleau Las Vegas', 7.50)
ON CONFLICT (store_code) DO NOTHING;
