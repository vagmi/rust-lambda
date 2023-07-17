-- Add migration script here
begin;
    create table todos(
        id serial primary key,
        title varchar(255) not null,
        completed boolean default false
    );
commit;
