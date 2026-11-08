import argparse
import hashlib
import json
import re
from pathlib import Path

ORIGINAL_ALGORITHM = ('Per COPY header: count,byte length,sum256(SHA256(encoded row)),'
                      'xor256(SHA256(encoded row)); order independent; '
                      'sequence setval statements compared exactly')
ADAPTER_ALGORITHM = 'crays.copy-multiset-fingerprint-canonical-tuple-sha256.v1'
HEX = re.compile(r'[0-9a-f]{64}')
IDENT = r'(?:[a-z_][a-z0-9_$]*|"(?:[^"\x00-\x1f]|"")*")'
QUALIFIED = re.compile(r'(' + IDENT + r')\.(' + IDENT + r')')
COPY = re.compile(r'COPY (' + IDENT + r')\.(' + IDENT + r') \((.*)\) FROM stdin;')
SEQUENCE = re.compile(r"SELECT pg_catalog\.setval\('((?:[^'\\\x00-\x1f]|'')+)', (-?[0-9]+), (true|false)\);")

def require(ok, label):
    if not ok:
        raise ValueError(label)

def canonical(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True,
                      separators=(',', ':'), allow_nan=False).encode('ascii')

def integer(value):
    return type(value) is int and value >= 0

def identifier(token):
    require(re.fullmatch(IDENT, token) is not None, 'UNSUPPORTED_IDENTIFIER')
    value = token[1:-1].replace('""', '"') if token.startswith('"') else token
    require(bool(value) and '\x00' not in value, 'INVALID_IDENTIFIER')
    return value

def columns(text):
    result = []
    offset = 0
    while offset < len(text):
        match = re.compile(IDENT).match(text, offset)
        require(match is not None, 'UNSUPPORTED_COPY_COLUMNS')
        result.append(identifier(match.group()))
        offset = match.end()
        if offset == len(text):
            break
        require(text[offset:offset+2] == ', ', 'UNSUPPORTED_COPY_COLUMN_SEPARATOR')
        offset += 2
        require(offset < len(text), 'TRAILING_COPY_COLUMN_SEPARATOR')
    require(bool(result) and len(result) == len(set(result)), 'DUPLICATE_OR_EMPTY_COLUMNS')
    return result

def adapt(document, *, realm, snapshot_authority_sha256):
    require(type(realm) is str and bool(realm.strip()) and realm == realm.strip(),
            'EXPLICIT_EXACT_ROOT_REALM_REQUIRED')
    require(type(snapshot_authority_sha256) is str and
            HEX.fullmatch(snapshot_authority_sha256) is not None,
            'EXPLICIT_ROOT_SNAPSHOT_AUTHORITY_SHA_REQUIRED')
    expected = {'algorithm', 'tables', 'sequenceStatements', 'totalRows',
                'tableBlocks', 'sequenceSets', 'rowContentsStored'}
    require(type(document) is dict and set(document) == expected, 'EXACT_FINGERPRINT_SCHEMA_REQUIRED')
    require(document['algorithm'] == ORIGINAL_ALGORITHM, 'EXACT_ORIGINAL_ALGORITHM_REQUIRED')
    require(document['rowContentsStored'] is False, 'ROW_CONTENTS_NOT_PERMITTED')
    require(type(document['tables']) is dict and type(document['sequenceStatements']) is list,
            'EXACT_OBJECT_COLLECTION_TYPES_REQUIRED')
    require(all(integer(document[k]) for k in ('totalRows', 'tableBlocks', 'sequenceSets')),
            'STRICT_NONNEGATIVE_INTEGER_TOTALS_REQUIRED')
    require(document['tableBlocks'] == len(document['tables']) and
            document['sequenceSets'] == len(document['sequenceStatements']), 'OBJECT_COUNTS_MISMATCH')
    objects = {}
    seen_relations = set()
    total = 0
    def add(kind, identity, fingerprint, rows):
        relation = tuple(identity)
        require(relation not in seen_relations, 'DUPLICATE_POSTGRES_RELATION_IDENTITY')
        seen_relations.add(relation)
        key = canonical([kind, *identity]).decode('ascii')
        require(key not in objects, 'DUPLICATE_CANONICAL_OBJECT_IDENTITY')
        preimage = [ADAPTER_ALGORITHM, ORIGINAL_ALGORITHM, kind, identity, fingerprint]
        objects[key] = {'kind': kind, 'contentSHA256': hashlib.sha256(canonical(preimage)).hexdigest(),
                        'rows': rows}
    for header, value in document['tables'].items():
        require(type(header) is str, 'COPY_HEADER_STRING_REQUIRED')
        match = COPY.fullmatch(header)
        require(match is not None, 'UNSUPPORTED_COPY_HEADER')
        identity = [identifier(match[1]), identifier(match[2])]
        ordered_columns = columns(match[3])
        require(type(value) is dict and set(value) == {'rows', 'bytes', 'sum', 'xor'},
                'EXACT_TABLE_FINGERPRINT_FIELDS_REQUIRED')
        require(integer(value['rows']) and integer(value['bytes']), 'STRICT_TABLE_COUNTS_REQUIRED')
        require(all(type(value[k]) is str and HEX.fullmatch(value[k]) is not None
                    for k in ('sum', 'xor')), 'EXACT_256BIT_FINGERPRINTS_REQUIRED')
        if value['rows'] == 0:
            require(value['bytes'] == 0 and value['sum'] == value['xor'] == '0'*64,
                    'INCONSISTENT_EMPTY_TABLE_FINGERPRINT')
        else:
            require(value['bytes'] >= value['rows'], 'INCONSISTENT_COPY_BYTE_COUNT')
        total += value['rows']
        add('table', identity, {'copyHeader': header, 'orderedColumns': ordered_columns,
                               'fingerprint': value}, value['rows'])
    require(total == document['totalRows'], 'TOTAL_ROWS_MISMATCH')
    for statement in document['sequenceStatements']:
        require(type(statement) is str, 'SEQUENCE_STATEMENT_STRING_REQUIRED')
        match = SEQUENCE.fullmatch(statement)
        require(match is not None, 'UNSUPPORTED_SEQUENCE_SETVAL')
        name = match[1].replace("''", "'")
        qualified = QUALIFIED.fullmatch(name)
        require(qualified is not None, 'QUALIFIED_SEQUENCE_IDENTITY_REQUIRED')
        value = int(match[2])
        require(-(1 << 63) <= value < (1 << 63), 'SEQUENCE_INT64_REQUIRED')
        identity = [identifier(qualified[1]), identifier(qualified[2])]
        add('sequence', identity, {'setvalStatement': statement, 'value': value,
                                  'isCalled': match[3] == 'true'}, None)
    return {'schema': 'crays.neon-rds.content-digest.v1', 'realm': realm,
            'snapshotAuthoritySHA256': snapshot_authority_sha256,
            'contentDigestAlgorithm': ADAPTER_ALGORITHM,
            'sourceFingerprintAlgorithm': ORIGINAL_ALGORITHM, 'objects': objects}

def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'DUPLICATE_JSON_KEY')
        result[key] = value
    return result

def reject_constant(value):
    raise ValueError('NONFINITE_JSON_CONSTANT_REJECTED')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('fingerprint', type=Path)
    parser.add_argument('--realm', required=True)
    parser.add_argument('--snapshot-authority-sha256', required=True)
    args = parser.parse_args()
    source = json.loads(args.fingerprint.read_bytes(), object_pairs_hook=unique_pairs,
                        parse_constant=reject_constant)
    result = adapt(source, realm=args.realm,
                   snapshot_authority_sha256=args.snapshot_authority_sha256)
    print(json.dumps(result, sort_keys=True, ensure_ascii=True, allow_nan=False))
