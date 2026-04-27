import os
import argparse
import pandas as pd
import xml.etree.ElementTree as ET

def convert_generic_xml_to_csv(xml_file: str, csv_file: str):
    """
    Attempts to read a flat or semi-flat XML file using pandas built-in read_xml.
    This works great for standard tabular XML data.
    """
    try:
        print(f"Attempting to parse {xml_file} using pandas...")
        df = pd.read_xml(xml_file)
        df.to_csv(csv_file, index=False)
        print(f"✅ Successfully converted. Saved to: {csv_file}")
        print(f"Dataset shape: {df.shape}")
        return True
    except Exception as e:
        print(f"Pandas read_xml failed: {e}")
        return False

def convert_apple_health_xml_to_csv(xml_file: str, csv_file: str):
    """
    Apple Health XML exports are very large and deeply nested. 
    This parses the <Record> tags specifically, extracting the attributes.
    """
    print(f"Attempting to parse {xml_file} as an Apple Health Export...")
    
    records = []
    try:
        context = ET.iterparse(xml_file, events=('end',))
        for event, elem in context:
            if elem.tag == 'Record':
                records.append(elem.attrib)
                elem.clear() # Clear memory
                
        if not records:
            print("No <Record> tags found. This might not be an Apple Health XML.")
            return False
            
        df = pd.DataFrame(records)
        df.to_csv(csv_file, index=False)
        print(f"✅ Successfully extracted {len(df)} records. Saved to: {csv_file}")
        return True
    except Exception as e:
        print(f"Apple Health parsing failed: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert XML to CSV.")
    parser.add_argument("xml_file", help="Path to the input XML file")
    parser.add_argument("csv_file", help="Path to the output CSV file")
    parser.add_argument("--health", action="store_true", help="Parse as an Apple Health Export")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.xml_file):
        print(f"❌ Error: File '{args.xml_file}' does not exist.")
        exit(1)
        
    if args.health:
        success = convert_apple_health_xml_to_csv(args.xml_file, args.csv_file)
    else:
        # Try generic pandas first, fall back to warning
        success = convert_generic_xml_to_csv(args.xml_file, args.csv_file)
        if not success:
            print("\n💡 Tip: If this is an Apple Health export, run the script with the --health flag:")
            print(f"   python convert_xml_to_csv.py {args.xml_file} {args.csv_file} --health")
