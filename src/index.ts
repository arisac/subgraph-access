import { store, Bytes } from '@graphprotocol/graph-ts'

import {
	Account,
	AccessControl,
	Role,
	AccessControlMember,
	AccessControlRole,
	AccessControlRoleMember,
	RoleAdminChanged,
	RoleGranted,
	RoleRevoked,
} from '../generated/schema'

import {
	RoleAdminChanged as RoleAdminChangedEvent,
	RoleGranted      as RoleGrantedEvent,
	RoleRevoked      as RoleRevokedEvent,
} from '../generated/AccessControl/AccessControl'

import {
	IERC165
} from '../generated/AccessControl/IERC165'

import {
	events,
	transactions,
} from '@amxx/graphprotocol-utils'

function toBytes(hexString: String): Bytes {
	let result = new Uint8Array(hexString.length / 2);
	for (let i = 0; i < hexString.length; i += 2) { 
		result[i / 2] = parseInt(hexString.substr(i, 2), 16) as u32;
	} 
	return result as Bytes;
}

function supportsInterface(contract: IERC165, interfaceId: String, expected: boolean = true): boolean {
	let supports = contract.try_supportsInterface(toBytes(interfaceId));
	return !supports.reverted && supports.value == expected;
}

function getErcType(contract: IERC165): String {
	if (supportsInterface(contract, "80ac58cd")) {
		return "erc721"
	}
	if (supportsInterface(contract, "d9b67a26")) {
		return "erc1155"
	}
	if (  supportsInterface(contract, "b0202a11") || (supportsInterface(contract, "4bbee2df") && supportsInterface(contract, "fb9ec8ce"))) {
		return "erc1363"
	}
	return "unknown"
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
	let contract = new AccessControl(event.address.toHex());
	let role     = new Role(event.params.role.toHex());
	let admin    = new Role(event.params.newAdminRole.toHex());
	let previous = new Role(event.params.previousAdminRole.toHex());

	let ercType: String = "unknown"
	let contractExsits = AccessControl.load(contract.id)
	if (contractExsits !== null) {
		ercType = contractExsits.ercType
	} else {
		ercType = getErcType(IERC165.bind(event.address))
	}
	contract.ercType = ercType.toString()

	contract.save();
	role.save();
	admin.save();
	previous.save();

	let accesscontrolrole      = new AccessControlRole(contract.id.concat('-').concat(role.id));
	accesscontrolrole.contract = contract.id;
	accesscontrolrole.role     = role.id;
	accesscontrolrole.admin    = admin.id;
	accesscontrolrole.save()

	let ev               = new RoleAdminChanged(events.id(event));
	ev.transaction       = transactions.log(event).id;
	ev.timestamp         = event.block.timestamp;
	ev.role              = accesscontrolrole.id;
	ev.newAdminRole      = admin.id;
	ev.previousAdminRole = previous.id;
	ev.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
	let contract = new AccessControl(event.address.toHex());
	let role     = new Role(event.params.role.toHex());
	let account  = new Account(event.params.account.toHex());
	let sender   = new Account(event.params.sender.toHex());
	
	let ercType: String = "unknown"
	let contractExsits = AccessControl.load(contract.id)
	if (contractExsits !== null) {
		ercType = contractExsits.ercType
	} else {
		ercType = getErcType(IERC165.bind(event.address))
	}
	contract.ercType = ercType.toString()

	contract.save();
	role.save();
	account.save();
	sender.save();

	let accesscontrolrole      = new AccessControlRole(contract.id.concat('-').concat(role.id));
	accesscontrolrole.contract = contract.id;
	accesscontrolrole.role     = role.id;
	accesscontrolrole.ercType  = ercType.toString();
	accesscontrolrole.save()

	let accesscontrolmemberExsits = AccessControlMember.load(contract.id.concat('-').concat(account.id))
	if (accesscontrolmemberExsits === null) {
		let accesscontrolmember         = new AccessControlMember(contract.id.concat('-').concat(account.id));
		accesscontrolmember.contract    = contract.id;
		accesscontrolmember.account     = account.id;
		accesscontrolmember.timestamp   = event.block.timestamp;
		accesscontrolmember.count       = 1;
		accesscontrolmember.ercType     = ercType.toString();
		accesscontrolmember.save()
	} else {
		let accesscontrolmember = accesscontrolmemberExsits;
		accesscontrolmember.count++;
		accesscontrolmember.save()
	}

	let accesscontrolrolemember               = new AccessControlRoleMember(accesscontrolrole.id.concat('-').concat(account.id));
	accesscontrolrolemember.accesscontrolrole = accesscontrolrole.id;
	accesscontrolrolemember.account           = account.id;
	accesscontrolrolemember.ercType           = ercType.toString();
	accesscontrolrolemember.timestamp         = event.block.timestamp;
	accesscontrolrolemember.save()

	let ev         = new RoleGranted(events.id(event));
	ev.transaction = transactions.log(event).id;
	ev.timestamp   = event.block.timestamp;
	ev.role        = accesscontrolrole.id;
	ev.account     = account.id;
	ev.sender      = sender.id;
	ev.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
	let contract = new AccessControl(event.address.toHex());
	let role     = new Role(event.params.role.toHex());
	let account  = new Account(event.params.account.toHex());
	let sender   = new Account(event.params.sender.toHex());

	let ercType: String = "unknown"
	let contractExsits = AccessControl.load(contract.id)
	if (contractExsits !== null) {
		ercType = contractExsits.ercType
	} else {
		ercType = getErcType(IERC165.bind(event.address))
	}
	contract.ercType = ercType.toString()

	contract.save();
	role.save();
	account.save();
	sender.save();

	let accesscontrolrole      = new AccessControlRole(contract.id.concat('-').concat(role.id));
	accesscontrolrole.contract = contract.id;
	accesscontrolrole.role     = role.id;
	accesscontrolrole.save()

	let accesscontrolmemberExsits = AccessControlMember.load(contract.id.concat('-').concat(account.id))
	if (accesscontrolmemberExsits !== null) {
		let accesscontrolmember = accesscontrolmemberExsits;
		if (accesscontrolmember.count > 1) {
			accesscontrolmember.count--;
			accesscontrolmember.timestamp = event.block.timestamp;
			accesscontrolmember.save()
		} else {
			store.remove('AccessControlMember', contract.id.concat('-').concat(account.id));
		}
	}

	store.remove('AccessControlRoleMember', accesscontrolrole.id.concat('-').concat(account.id));

	let ev         = new RoleRevoked(events.id(event));
	ev.transaction = transactions.log(event).id;
	ev.timestamp   = event.block.timestamp;
	ev.role        = accesscontrolrole.id;
	ev.account     = account.id;
	ev.sender      = sender.id;
	ev.save()
}
