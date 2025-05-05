module contracts::core;

use std::string::String;
use std::type_name;
use sui::bcs::to_bytes;
use sui::coin::Coin;
use sui::ecdsa_k1;
use sui::event::emit;
use sui::object_bag::{Self, ObjectBag};
use sui::object_table::{Self, ObjectTable};
use sui::table::{Self, Table};
use sui::table_vec::{Self, TableVec};
use sui::transfer::share_object;

#[error]
const EInvalidSignature: vector<u8> = b"Invalid instruction signature";

#[error]
const ENameAlreadyRegistered: vector<u8> = b"Name already registered";

public struct Name has drop, store {
    pub: vector<u8>,
    owner: address,
}

public struct Mizt has key, store {
    id: UID,
    accounts: ObjectTable<vector<u8>, ObjectBag>, // pub -> coin TypeName -> Coin
    names: Table<String, Name>,
    name_owners: Table<address, String>,
    ephemeral_pubs: TableVec<vector<u8>>,
}

// events
public struct NewEphemeralPub has copy, drop {
    ephemeral_pub: vector<u8>,
}

fun init(ctx: &mut TxContext) {
    let mizt = Mizt {
        id: object::new(ctx),
        accounts: object_table::new(ctx),
        names: table::new(ctx),
        name_owners: table::new(ctx),
        ephemeral_pubs: table_vec::empty(ctx),
    };
    share_object(mizt);
}

fun new_ephemeral_pub(mizt: &mut Mizt, ephemeral_pub: vector<u8>) {
    mizt.ephemeral_pubs.push_back(ephemeral_pub);
    emit(NewEphemeralPub { ephemeral_pub });
}

public fun register_name(mizt: &mut Mizt, name: String, pub: vector<u8>, ctx: &mut TxContext) {
    assert!(!mizt.name_owners.contains(ctx.sender()), ENameAlreadyRegistered);

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
    shared_pub: vector<u8>,
    ephemeral_pub: vector<u8>,
    coin: Coin<T>,
    ctx: &mut TxContext,
) {
    if (!mizt.accounts.contains(shared_pub)) {
        mizt.accounts.add(shared_pub, object_bag::new(ctx));
    };

    let account: &mut ObjectBag = mizt.accounts.borrow_mut(shared_pub);
    let coin_type = type_name::get<T>();

    if (!account.contains(coin_type)) {
        account.add(coin_type, coin);
    } else {
        let old_coin: &mut Coin<T> = account.borrow_mut(coin_type);
        old_coin.join(coin);
    };

    new_ephemeral_pub(mizt, ephemeral_pub);
}

public struct TransferInstruction<phantom T> has copy, drop {
    signature: vector<u8>,
    from_shared_pub: vector<u8>,
    value: u64,
    to_recipient: Option<address>,
    to_shared_pub: Option<vector<u8>>,
    to_ephemeral_pub: Option<vector<u8>>,
}

public fun transfer_coin_out<T>(
    mizt: &mut Mizt,
    instruction: TransferInstruction<T>,
    ctx: &mut TxContext,
) {
    let coin_type = type_name::get<T>();
    let coin: &mut Coin<T> = mizt
        .accounts
        .borrow_mut(instruction.from_shared_pub)
        .borrow_mut(coin_type);
    let out_coin = coin.split(instruction.value, ctx);

    let mut message: vector<u8> = vector::empty();
    message.append(to_bytes(&instruction.from_shared_pub));
    message.append(to_bytes(&coin_type));
    message.append(to_bytes(&instruction.value));
    // either to_recipient or to_shared_pub/to_ephemeral_pub
    assert!(
        instruction.to_recipient.is_some() || (instruction.to_shared_pub.is_some() && instruction.to_ephemeral_pub.is_some()),
    );
    if (instruction.to_recipient.is_some()) {
        let recipient = instruction.to_recipient.borrow();
        message.append(to_bytes(&0u64));
        message.append(to_bytes(recipient));
        // transfer out coin to recipient
        transfer::public_transfer(out_coin, *recipient);
    } else {
        let shared_pub = instruction.to_shared_pub.borrow();
        let ephemeral_pub = instruction.to_ephemeral_pub.borrow();
        message.append(to_bytes(&1u64));
        message.append(to_bytes(shared_pub));
        message.append(to_bytes(ephemeral_pub));
        // transfer out coin to shared pub
        transfer_coin_in(mizt, *shared_pub, *ephemeral_pub, out_coin, ctx);
    };

    // verify signature
    assert!(
        ecdsa_k1::secp256k1_verify(
            &instruction.signature,
            &instruction.from_shared_pub,
            &message,
            0,
        ),
        EInvalidSignature,
    );
}
