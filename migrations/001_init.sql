CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_hash VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    timer_end TIMESTAMP,         -- quando scade il timer
    last_click TIMESTAMP,        -- quando ha cliccato l'ultima volta
    personal_ref_code VARCHAR(255) UNIQUE, -- link ref unico
    invited_by VARCHAR(255),     -- user_hash di chi lo ha invitato
    referral_count INT DEFAULT 0 -- quanti referral ha portato
);

CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    -- Esempi di possibili impostazioni che l'admin può cambiare
    button_text VARCHAR(255) DEFAULT 'Ritira 100€',
    button_color VARCHAR(50) DEFAULT '#00AA00',
    background_color VARCHAR(50) DEFAULT '#FFFFFF',
    background_image VARCHAR(255) DEFAULT NULL,
    extra_sections TEXT          -- potresti salvare in JSON o HTML le sezioni aggiuntive
);