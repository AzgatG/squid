
CREATE TABLE metadata (
    id varchar primary key,
    spec_name varchar not null,
    spec_version integer,
    block_height integer not null,
    block_hash char(66) not null,
    hex varchar not null
);


CREATE TABLE block (
    id char(16) primary key,
    height integer not null,
    hash char(66) not null,
    parent_hash char(66) not null,
    timestamp timestamptz not null,
    spec_id text not null references metadata,
    validator varchar
);


CREATE INDEX IDX_block__height ON block(height);
CREATE INDEX IDX_block__hash ON block(hash);
CREATE INDEX IDX_block__timestamp ON block(timestamp);


CREATE TABLE extrinsic (
    id char(23) primary key,
    block_id char(16) not null references block on delete cascade,
    index_in_block integer not null,
    signature jsonb,
    success bool not null,
    call_id varchar(30) not null,
    hash char(66) not null,
    pos integer not null
);


CREATE INDEX IDX_extrinsic__block__index ON extrinsic(block_id, index_in_block);


CREATE TABLE call (
    id varchar(30) primary key,
    parent_id varchar(30) references call,
    block_id char(16) not null references block on delete cascade,
    extrinsic_id char(23) not null references extrinsic on delete cascade,
    success bool not null,
    name varchar not null,
    args jsonb,
    pos integer not null
);


CREATE INDEX IDX_call__name__block ON call(name, block_id);
CREATE INDEX IDX_call__extrinsic__index ON call(extrinsic_id);
CREATE INDEX IDX_call__parent ON call(parent_id);


CREATE TABLE event (
    id char(23) primary key,
    block_id char(16) not null references block on delete cascade,
    index_in_block integer not null,
    phase varchar not null,
    extrinsic_id char(23) references extrinsic on delete cascade,
    call_id varchar(30) references call,
    name varchar not null,
    args jsonb,
    pos integer not null
);


CREATE INDEX IDX_event__name__block ON event(name, block_id);
CREATE INDEX IDX_event__block__index ON event(block_id, index_in_block);
CREATE INDEX IDX_event__extrinsic ON event(extrinsic_id);
CREATE INDEX IDX_event__call ON event(call_id);
CREATE INDEX IDX_event__args ON event USING GIN (args);


CREATE TABLE warning (
    block_id char(16),
    message varchar
);