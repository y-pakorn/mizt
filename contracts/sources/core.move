module contracts::core;

use std::string::String;
use sui::coin::Coin;
use sui::event::emit;
use sui::table::{Self, Table};
use sui::table_vec::{Self, TableVec};
use sui::transfer::share_object;

#[error]
const ENameAlreadyRegistered: vector<u8> = b"Name already registered";

public struct Name has drop, store {
    pub: vector<u8>,
    owner: address,
}

public struct Mizt has key, store {
    id: UID,
    names: Table<String, Name>,
    name_owners: Table<address, String>,
    ephemeral_pubs: TableVec<vector<u8>>,
}

// events
public struct NewEphemeralPub has copy, drop {
    ephemeral_pub: vector<u8>,
    addr: address,
}

fun init(ctx: &mut TxContext) {
    let mizt = Mizt {
        id: object::new(ctx),
        names: table::new(ctx),
        name_owners: table::new(ctx),
        ephemeral_pubs: table_vec::empty(ctx),
    };
    share_object(mizt);
}

fun new_ephemeral_pub(mizt: &mut Mizt, ephemeral_pub: vector<u8>, addr: address) {
    mizt.ephemeral_pubs.push_back(ephemeral_pub);
    emit(NewEphemeralPub { ephemeral_pub, addr });
}

public fun register_name(mizt: &mut Mizt, name: String, pub: vector<u8>, ctx: &mut TxContext) {
    assert!(!mizt.names.contains(name), ENameAlreadyRegistered);

    // remove old name if exists
    if (mizt.name_owners.contains(ctx.sender())) {
        let old_name = mizt.name_owners.remove(ctx.sender());
        mizt.names.remove(old_name);
    };

    // register new name
    mizt
        .names
        .add(
            name,
            Name {
                pub,
                owner: ctx.sender(),
            },
        );
    mizt.name_owners.add(ctx.sender(), name);
}

public fun transfer_coin_in<T>(
    mizt: &mut Mizt,
    addr: address,
    ephemeral_pub: vector<u8>,
    coin: Coin<T>,
    _: &mut TxContext,
) {
    transfer::public_transfer(coin, addr);
    new_ephemeral_pub(mizt, ephemeral_pub, addr);
}
