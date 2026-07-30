ALTER TABLE `user`
ADD `account_type` text DEFAULT 'client' NOT NULL
CHECK (`account_type` in ('client', 'driver'));
