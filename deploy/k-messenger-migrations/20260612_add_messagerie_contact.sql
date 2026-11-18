CREATE TABLE IF NOT EXISTS messagerie.contact (
    id VARCHAR(12) NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') PRIMARY KEY,
    requester_id VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    addressee_id VARCHAR(12) NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_distinct_users_check CHECK (requester_id <> addressee_id),
    CONSTRAINT contact_status_check CHECK (status IN ('pending', 'accepted', 'blocked')),
    CONSTRAINT contact_request_unique UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_requester
    ON messagerie.contact(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_contact_addressee
    ON messagerie.contact(addressee_id, status);
