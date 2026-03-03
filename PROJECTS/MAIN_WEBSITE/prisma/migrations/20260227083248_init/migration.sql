-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "package" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "gallery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image_url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "caption" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "site_assets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "asset_type" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "alt_text" TEXT,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "home_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image_url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "caption" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_public_id_key" ON "gallery"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_assets_asset_type_key" ON "site_assets"("asset_type");
